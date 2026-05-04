import { extractFeatures, createJieba, type VoiceFeatures, type Jieba } from './features';
import { chatJson } from '@/lib/llm/deepseek';
import { embed } from '@/lib/embeddings';

const W_HARD = 0.4;
const W_LLM = 0.4;
const W_EMB = 0.2;

export interface SubScores {
  aiTaste: number;
  wordAlignment: number;
  sentenceVar: number;
}

export interface ScoreResult {
  total: number;
  hardSignal: number;
  llmJudge: number;
  embedding: number;
  sub: SubScores;
  rationale: string;
}

export async function scoreVoice(
  draft: string,
  userBaseline: VoiceFeatures,
  userSamples: string[]
): Promise<ScoreResult> {
  const jieba = createJieba();
  const draftFeatures = extractFeatures([{ id: '_draft', body: draft }], jieba);
  const aiTaste = clamp(1 - Math.min(1, draftFeatures.genericFunctionWordRate / 5));
  const wordAlignment = jaccardTop50(draft, userSamples.join('\n\n'), jieba);
  const baselineCV = userBaseline.sentenceLengthCV || 0.4;
  const sentenceVar = clamp(draftFeatures.sentenceLengthCV / baselineCV);
  const hardSignal = (aiTaste + wordAlignment + sentenceVar) / 3;

  const llmJudge = await scoreLLMJudge(draft, userSamples);
  const embedding = await scoreEmbedding(draft, userSamples);

  const total = clamp(W_HARD * hardSignal + W_LLM * llmJudge + W_EMB * embedding);
  const rationale = `hard ${hardSignal.toFixed(2)} | judge ${llmJudge.toFixed(2)} | emb ${embedding.toFixed(2)}`;

  return {
    total,
    hardSignal,
    llmJudge,
    embedding,
    sub: { aiTaste, wordAlignment, sentenceVar },
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

async function scoreLLMJudge(draft: string, userSamples: string[]): Promise<number> {
  const sample = userSamples.slice(0, 2).join('\n\n— —\n\n').slice(0, 2000);
  try {
    const result = await chatJson<{ score: number; reason: string }>(
      [
        {
          role: 'system',
          content:
            '你是一位严格的中文文风评判。给定作者的过往样本和一段待评稿，判断该稿读起来像同一作者写的概率（0.0—1.0）。只看语气节奏与措辞习惯，不评判事实正确性。',
        },
        {
          role: 'user',
          content: `【作者样本】\n${sample}\n\n【待评稿】\n${draft}\n\n请用 JSON 回复：{"score": 0..1, "reason": "20 字以内"}`,
        },
      ],
      { model: 'deepseek-reasoner', maxTokens: 200 }
    );
    return clamp(result.score);
  } catch {
    return 0.5;
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
