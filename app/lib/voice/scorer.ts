import { extractFeatures, createJieba, type VoiceFeatures, type Jieba } from './features';
import { extractKeyTerms, nounJaccard, extractCitations, citationRecall } from './terms';
import { chatJson } from '@/lib/llm';
import { embed } from '@/lib/embeddings';
import { SCORER_JUDGE_SYSTEM_PROMPT } from '@/lib/foxes/prompts/mo';

const W_HARD = 0.4;
const W_LLM = 0.4;
const W_EMB = 0.2;

// Calibrated 2026-05-06 (phase #13.8) — was /5 which left AI 味 saturating to 0
// when the regex didn't match. Lowered after expanding GENERIC_FUNCTION_WORD_RE
// to catch hedge phrases ("一定的成就", "根本性的", "在特定应用中"). 2.5
// means a single hedge per ~400 chars puts the score in the visible range.
const AI_TASTE_DIVISOR = 2.5;

export interface SubScores {
  aiTaste: number;
  wordAlignment: number;
  sentenceVar: number;
  scopeFidelity: number;
  citationFidelity: number;
}

export interface ScoreResult {
  total: number;
  hardSignal: number;
  llmJudge: number;
  termFidelity: number;
  embedding: number;
  sub: SubScores;
  rationale: string;
}

/**
 * Deterministic hard-signal sub-scores. No LLM, no embedding — pure functions
 * of the draft + corpus + source. Used both as part of `scoreVoice` (for the
 * VOICE column) and on its own for the GENERIC column where we want the same
 * 4-metric panel without paying for LLM judge + embedding.
 */
export function computeHardSubScores(
  draft: string,
  userBaseline: VoiceFeatures,
  userSamples: string[],
  sourceText?: string,
  jiebaInstance?: Jieba,
): SubScores {
  const jieba = jiebaInstance ?? createJieba();
  const draftFeatures = extractFeatures([{ id: '_draft', body: draft }], jieba);
  const aiTaste = clamp(1 - Math.min(1, draftFeatures.genericFunctionWordRate / AI_TASTE_DIVISOR));
  const wordAlignment = jaccardTop50(draft, userSamples.join('\n\n'), jieba);
  const baselineCV = userBaseline.sentenceLengthCV || 0.4;
  const sentenceVar = clamp(draftFeatures.sentenceLengthCV / baselineCV);
  const sourceTerms = sourceText ? extractKeyTerms(sourceText, jieba) : [];
  const draftTerms = extractKeyTerms(draft, jieba);
  const scopeFidelity = sourceText ? nounJaccard(sourceTerms, draftTerms) : 1;
  const sourceCitations = sourceText ? extractCitations(sourceText) : [];
  const draftCitations = extractCitations(draft);
  const citationFidelity = citationRecall(sourceCitations, draftCitations);
  return { aiTaste, wordAlignment, sentenceVar, scopeFidelity, citationFidelity };
}

export async function scoreVoice(
  draft: string,
  userBaseline: VoiceFeatures,
  userSamples: string[],
  sourceText?: string
): Promise<ScoreResult> {
  const jieba = createJieba();
  const sub = computeHardSubScores(draft, userBaseline, userSamples, sourceText, jieba);
  const hardSignal = (sub.aiTaste + sub.wordAlignment + sub.sentenceVar + sub.scopeFidelity + sub.citationFidelity) / 5;

  const sourceTerms = sourceText ? extractKeyTerms(sourceText, jieba) : [];
  const judgeResult = await scoreLLMJudge(draft, userSamples, sourceText, sourceTerms);
  const llmJudge = judgeResult.style;
  const termFidelity = judgeResult.termFidelity;
  const embedding = await scoreEmbedding(draft, userSamples);

  const total = clamp(W_HARD * hardSignal + W_LLM * llmJudge + W_EMB * embedding);
  const rationale = `hard ${hardSignal.toFixed(2)} | judge ${llmJudge.toFixed(2)} | term ${termFidelity.toFixed(2)} | emb ${embedding.toFixed(2)}`;

  return {
    total,
    hardSignal,
    llmJudge,
    termFidelity,
    embedding,
    sub,
    rationale,
  };
}

function clamp(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function jaccardTop50(a: string, b: string, jieba: Jieba): number {
  const top = (s: string): Set<string> => {
    const tokens = jieba.cut(s).filter((t) => /[一-鿿]/.test(t) && t.length >= 2);
    const counts: Record<string, number> = {};
    for (const t of tokens) counts[t] = (counts[t] ?? 0) + 1;
    return new Set(
      Object.entries(counts)
        .sort((x, y) => y[1] - x[1])
        .slice(0, 50)
        .map(([k]) => k)
    );
  };
  const A = top(a);
  const B = top(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

interface JudgeResult {
  style: number;
  termFidelity: number;
  reason: string;
}

async function scoreLLMJudge(
  draft: string,
  userSamples: string[],
  sourceText?: string,
  sourceTerms: string[] = []
): Promise<JudgeResult> {
  const sample = userSamples.slice(0, 2).join('\n\n— —\n\n').slice(0, 2000);
  const termList = sourceTerms.length > 0 ? sourceTerms.join(' / ') : '（无）';
  const sourceBlock = sourceText
    ? `\n\n【源段】\n${sourceText.slice(0, 1500)}\n\n【必须保留的术语】${termList}`
    : '';
  try {
    const result = await chatJson<{ style: number; termFidelity: number; reason: string }>(
      [
        {
          role: 'system',
          content: SCORER_JUDGE_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `【作者样本】\n${sample}${sourceBlock}\n\n【待评稿】\n${draft}\n\n请用 JSON 回复：{"style": 0..1, "termFidelity": 0..1, "reason": "20 字以内"}`,
        },
      ],
      { model: 'deepseek-reasoner', maxTokens: 240 }
    );
    return {
      style: clamp(result.style),
      termFidelity: clamp(result.termFidelity ?? 1),
      reason: result.reason ?? '',
    };
  } catch {
    return { style: 0.5, termFidelity: 1, reason: '' };
  }
}

async function scoreEmbedding(draft: string, userSamples: string[]): Promise<number> {
  if (userSamples.length === 0) return 0;
  try {
    const [draftEmb, ...sampleEmbs] = await embed([draft, ...userSamples.slice(0, 3)]);
    const sims = sampleEmbs.map((s) => cosine(draftEmb, s));
    return clamp(Math.max(...sims));
  } catch {
    return 0;
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] ** 2;
    nb += b[i] ** 2;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}
