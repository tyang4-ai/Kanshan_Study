import {
  chat,
  chatJson,
  GENERIC_SYSTEM_PROMPT,
  VOICE_SYSTEM_PROMPT,
  type ChatMessage,
  type Provider,
} from '@/lib/llm';
import { scoreVoice, computeHardSubScores, type ScoreResult, type SubScores } from '@/lib/voice/scorer';
import { createJieba, type VoiceFeatures } from '@/lib/voice/features';
import { extractKeyTerms, extractCitations } from '@/lib/voice/terms';
import { searchVault, type VaultHit } from '@/lib/vault/search';
import guwanxiSeed from '@/content/seed/vault-guwanxi.json';

export { GENERIC_SYSTEM_PROMPT, VOICE_SYSTEM_PROMPT };

export interface VoiceSpan {
  start: number;
  end: number;
  sourceArticleId: string;
  sourceTitle: string;
  sourceDate: string;
}

export interface IterStep {
  iter: number;
  draft: string;
  voiceSpans: VoiceSpan[];
  score: ScoreResult;
  accepted: boolean;
}

export interface VoiceFillFinal {
  generic: string;
  voice: string;
  voiceSpans: VoiceSpan[];
  voiceScore: ScoreResult;
  genericScore?: SubScores;
  trace: IterStep[];
  voiceSources: { id: string; title: string; date: string }[];
}

export type VoiceFillEvent =
  | { event: 'generic'; data: { text: string } }
  | { event: 'iter'; data: IterStep }
  | { event: 'final'; data: VoiceFillFinal };

interface SourceSample {
  id: string;
  title: string;
  date: string;
  body: string;
}

interface SeedEntry {
  id: string;
  title: string;
  snippet: string;
  date: string;
  tags: string[];
}

interface VoiceFingerprint {
  register?: string;
  cadenceNotes?: string[];
  signaturePhrases?: string[];
  forbiddenPhrases?: string[];
  openingPattern?: string;
  endingPattern?: string;
}

// Cache fingerprints by userId — read once per process. Falls back to null
// when the per-user fingerprint file is missing (e.g., for unknown accounts).
const fingerprintCache: Record<string, VoiceFingerprint | null> = {};

// R4 security (Cao Renxin) P1: allowlist userId before the dynamic import.
// Bundler static resolution is the current mitigation against path traversal
// but we shouldn't depend on it — defense in depth.
const KNOWN_USER_IDS: ReadonlySet<string> = new Set(['me', 'guwanxi']);

async function loadVoiceFingerprint(userId: string): Promise<VoiceFingerprint | null> {
  if (userId in fingerprintCache) return fingerprintCache[userId];
  if (!KNOWN_USER_IDS.has(userId)) {
    fingerprintCache[userId] = null;
    return null;
  }
  try {
    // Dynamic import gives bundler-friendly path resolution + tree-shakes
    // unused per-user fingerprints out of the client bundle.
    const mod = await import(`@/content/corpus/${userId}/voice-fingerprint.json`);
    fingerprintCache[userId] = mod.default as VoiceFingerprint;
  } catch {
    fingerprintCache[userId] = null;
  }
  return fingerprintCache[userId];
}

function buildFingerprintBlock(fp: VoiceFingerprint | null): string {
  if (!fp) return '';
  const lines: string[] = ['【作者语风指纹】'];
  if (fp.register) lines.push(`Register: ${fp.register}`);
  if (fp.cadenceNotes?.length) {
    lines.push('节奏要点：');
    fp.cadenceNotes.forEach((n) => lines.push(`  - ${n}`));
  }
  if (fp.signaturePhrases?.length) {
    lines.push(`常用语：${fp.signaturePhrases.join(' / ')}（在合适处使用 1-3 个，不要堆砌）`);
  }
  if (fp.forbiddenPhrases?.length) {
    lines.push(`禁用语：${fp.forbiddenPhrases.join(' / ')}（任何一项都不得出现）`);
  }
  if (fp.openingPattern) lines.push(`开头：${fp.openingPattern}`);
  if (fp.endingPattern) lines.push(`结尾：${fp.endingPattern}`);
  return lines.join('\n');
}

interface VoiceLLMSpan {
  start: number;
  end: number;
  sourceIndex: number;
  rationale?: string;
}

interface VoiceLLMResult {
  text: string;
  voiceSpans: VoiceLLMSpan[];
}

const MAX_ITERS = 3;
const ACCEPT_THRESHOLD = 0.85;

async function loadSamples(userId: string, query: string): Promise<SourceSample[]> {
  try {
    const hits = await searchVault(userId, query, 5);
    return hits.map((h: VaultHit) => ({
      id: h.articleId,
      title: h.title,
      date: h.date,
      body: h.content,
    }));
  } catch {
    if (userId !== 'guwanxi') return [];
    const seed = guwanxiSeed as SeedEntry[];
    return seed.slice(0, 5).map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      body: e.snippet,
    }));
  }
}

async function draftGeneric(
  bullets: string,
  mode: 'fill' | 'polish',
  selection: string,
  mustPreserveTerms: string[],
  mustPreserveCitations: string[],
  apiKey?: string,
  provider?: Provider,
): Promise<string> {
  const termLine =
    mustPreserveTerms.length > 0
      ? `\n\n【必须保留的术语】${mustPreserveTerms.join(' / ')}（任何一项必须按此写法出现在输出中）`
      : '';
  const citationLine =
    mustPreserveCitations.length > 0
      ? `\n\n【必须保留的引用】${mustPreserveCitations.join(' ')}（每一个引用编号必须原样出现在输出中，位置可调整）`
      : '';
  const userMsg =
    mode === 'fill'
      ? `请根据下列要点，写一段 200-350 字的中文段落：\n\n${bullets}${termLine}${citationLine}`
      : `请润色下列段落（保持原意，200-350 字）：\n\n要点：${bullets}\n\n原段：${selection}${termLine}${citationLine}`;
  const messages: ChatMessage[] = [
    { role: 'system', content: GENERIC_SYSTEM_PROMPT },
    { role: 'user', content: userMsg },
  ];
  return chat(messages, { temperature: 0.6, maxTokens: 600, apiKey, provider });
}

function buildSampleBlock(samples: SourceSample[]): string {
  return samples
    .map((s, i) => `【样本${i}】《${s.title}》(${s.date})\n${s.body}`)
    .join('\n\n— —\n\n');
}

function mapSpans(rawSpans: VoiceLLMSpan[], samples: SourceSample[]): VoiceSpan[] {
  const out: VoiceSpan[] = [];
  for (const s of rawSpans) {
    const src = samples[s.sourceIndex];
    if (!src) continue;
    if (typeof s.start !== 'number' || typeof s.end !== 'number') continue;
    if (s.end <= s.start) continue;
    out.push({
      start: s.start,
      end: s.end,
      sourceArticleId: src.id,
      sourceTitle: src.title,
      sourceDate: src.date,
    });
  }
  return out;
}

async function draftVoice(
  bullets: string,
  mode: 'fill' | 'polish',
  selection: string,
  samples: SourceSample[],
  mustPreserveTerms: string[],
  mustPreserveCitations: string[],
  fingerprint: VoiceFingerprint | null,
  apiKey?: string,
  provider?: Provider,
): Promise<{ text: string; voiceSpans: VoiceSpan[] }> {
  const sampleBlock = buildSampleBlock(samples);
  const fingerprintBlock = buildFingerprintBlock(fingerprint);
  const fingerprintPrefix = fingerprintBlock ? `${fingerprintBlock}\n\n` : '';
  const termBlock =
    mustPreserveTerms.length > 0
      ? `\n\n【必须保留的术语】${mustPreserveTerms.join(' / ')}（任何一项必须按此写法出现在输出中，不得替换或删除）`
      : '';
  const citationBlock =
    mustPreserveCitations.length > 0
      ? `\n\n【必须保留的引用】${mustPreserveCitations.join(' ')}（每一个引用编号必须原样出现在输出中，位置可调整）`
      : '';
  const scopeRule =
    mode === 'polish'
      ? '\n\n【范围约束】重写不得引入【原段】未提及的具体概念，即使【作者样本】里讨论过相关话题。'
      : '';
  const userMsg =
    mode === 'fill'
      ? `${fingerprintPrefix}【作者样本】\n${sampleBlock}\n\n【要点】\n${bullets}${termBlock}${citationBlock}\n\n请用作者的文风写一段 200-350 字的中文段落。返回 JSON。`
      : `${fingerprintPrefix}【作者样本】\n${sampleBlock}\n\n【要点】\n${bullets}\n\n【原段】\n${selection}${termBlock}${citationBlock}${scopeRule}\n\n请按作者文风重写原段，200-350 字。返回 JSON。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: VOICE_SYSTEM_PROMPT },
    { role: 'user', content: userMsg },
  ];

  try {
    const result = await chatJson<VoiceLLMResult>(messages, {
      temperature: 0.7,
      maxTokens: 900,
      apiKey,
      provider,
    });
    return {
      text: result.text,
      voiceSpans: mapSpans(result.voiceSpans ?? [], samples),
    };
  } catch {
    const text = await chat(
      [
        { role: 'system', content: VOICE_SYSTEM_PROMPT },
        { role: 'user', content: userMsg },
      ],
      { temperature: 0.7, maxTokens: 900, apiKey, provider }
    );
    return { text, voiceSpans: [] };
  }
}

export function pickWeakestSubScore(sub: SubScores): keyof SubScores {
  const entries = Object.entries(sub) as [keyof SubScores, number][];
  let weakest: keyof SubScores = entries[0][0];
  let min = entries[0][1];
  for (const [k, v] of entries) {
    if (v < min) {
      min = v;
      weakest = k;
    }
  }
  return weakest;
}

function targetHint(weakest: keyof SubScores): string {
  switch (weakest) {
    case 'aiTaste':
      return '减少「首先/其次/众所周知/综上所述/一定的/根本性的/在特定...中/尽管...但」一类套话词，写得更具体、更像人话。';
    case 'wordAlignment':
      return '更多复用作者样本里的高频用词与术语习惯。';
    case 'sentenceVar':
      return '让句长更有起伏：长句之后接短句，避免一刀切的长度。';
    case 'scopeFidelity':
      return '保持范围与【原段】一致：不引入原段未出现的具体概念；不替换术语。';
    case 'citationFidelity':
      return '【原段】里的每一个引用编号（如 [3] / [v7] / [@答主]）必须原样出现在输出中，位置可调整但不得删除。';
  }
}

async function rewriteForVoice(
  prevDraft: string,
  bullets: string,
  samples: SourceSample[],
  weakest: keyof SubScores,
  mustPreserveTerms: string[],
  mustPreserveCitations: string[],
  selection: string,
  fingerprint: VoiceFingerprint | null,
  apiKey?: string,
  provider?: Provider,
): Promise<{ text: string; voiceSpans: VoiceSpan[] }> {
  const sampleBlock = buildSampleBlock(samples);
  const fingerprintBlock = buildFingerprintBlock(fingerprint);
  const fingerprintPrefix = fingerprintBlock ? `${fingerprintBlock}\n\n` : '';
  const termBlock =
    mustPreserveTerms.length > 0
      ? `\n\n【必须保留的术语】${mustPreserveTerms.join(' / ')}（任何一项必须按此写法出现在输出中）`
      : '';
  const citationBlock =
    mustPreserveCitations.length > 0
      ? `\n\n【必须保留的引用】${mustPreserveCitations.join(' ')}`
      : '';
  const sourceBlock = selection ? `\n\n【原段】\n${selection}\n\n【范围约束】重写不得引入【原段】未提及的具体概念。` : '';
  const userMsg = `${fingerprintPrefix}【作者样本】\n${sampleBlock}\n\n【要点】\n${bullets}${sourceBlock}\n\n【上一稿】\n${prevDraft}\n\n【需重点改进】${targetHint(weakest)}${termBlock}${citationBlock}\n\n请重写这一段，仍 200-350 字。返回 JSON。`;
  const messages: ChatMessage[] = [
    { role: 'system', content: VOICE_SYSTEM_PROMPT },
    { role: 'user', content: userMsg },
  ];
  try {
    const result = await chatJson<VoiceLLMResult>(messages, {
      temperature: 0.7,
      maxTokens: 900,
      apiKey,
      provider,
    });
    return {
      text: result.text,
      voiceSpans: mapSpans(result.voiceSpans ?? [], samples),
    };
  } catch {
    const text = await chat(messages, {
      temperature: 0.7,
      maxTokens: 900,
      apiKey,
      provider,
    });
    return { text, voiceSpans: [] };
  }
}

export async function* voiceFillStream(
  userId: string,
  bullets: string,
  mode: 'fill' | 'polish',
  selection: string,
  baseline: VoiceFeatures,
  apiKey?: string,
  provider?: Provider,
): AsyncGenerator<VoiceFillEvent, void, unknown> {
  // Vault embedding query: use ONLY the selection (or bullets in `fill` mode
  // when there is no selection). Concatenating bullets + selection contaminated
  // the search when bullets carried context from a different topic, causing
  // the rewriter to drift onto the bullets' domain (persona-review 2026-05-10:
  // psych selection + bioE bullets returned bioE samples → bioE draft).
  const query = (mode === 'polish' ? selection : bullets || selection).trim();
  const samples = await loadSamples(userId, query);
  const sampleBodies = samples.map((s) => s.body);
  // Voice fingerprint distillation — prose-level cadence markers + signature
  // phrases. Persona-review 2026-05-10 王婉清 P1: samples alone produced
  // "professional-anonymous" voice; fingerprint surfaces the author DNA.
  const fingerprint = await loadVoiceFingerprint(userId);

  const jieba = createJieba();
  const sourceForTerms = mode === 'polish' ? selection : bullets;
  const mustPreserveTerms = extractKeyTerms(sourceForTerms, jieba);
  const mustPreserveCitations = extractCitations(sourceForTerms);
  const sourceText = mode === 'polish' ? selection : undefined;

  const generic = await draftGeneric(bullets, mode, selection, mustPreserveTerms, mustPreserveCitations, apiKey, provider);
  yield { event: 'generic', data: { text: generic } };

  const first = await draftVoice(bullets, mode, selection, samples, mustPreserveTerms, mustPreserveCitations, fingerprint, apiKey, provider);
  let currentDraft = first.text;
  let currentSpans = first.voiceSpans;
  let currentScore = await scoreVoice(currentDraft, baseline, sampleBodies, sourceText);

  let bestText = currentDraft;
  let bestSpans = currentSpans;
  let bestScore = currentScore;

  const trace: IterStep[] = [];
  let iter = 1;
  let accepted = currentScore.total >= ACCEPT_THRESHOLD;

  trace.push({
    iter,
    draft: currentDraft,
    voiceSpans: currentSpans,
    score: currentScore,
    accepted,
  });
  yield { event: 'iter', data: trace[trace.length - 1] };

  while (!accepted && iter < MAX_ITERS) {
    iter++;
    const weakest = pickWeakestSubScore(currentScore.sub);
    const next = await rewriteForVoice(currentDraft, bullets, samples, weakest, mustPreserveTerms, mustPreserveCitations, selection, fingerprint, apiKey, provider);
    currentDraft = next.text;
    currentSpans = next.voiceSpans;
    currentScore = await scoreVoice(currentDraft, baseline, sampleBodies, sourceText);
    accepted = currentScore.total >= ACCEPT_THRESHOLD;
    if (currentScore.total > bestScore.total) {
      bestText = currentDraft;
      bestSpans = currentSpans;
      bestScore = currentScore;
    }
    trace.push({
      iter,
      draft: currentDraft,
      voiceSpans: currentSpans,
      score: currentScore,
      accepted,
    });
    yield { event: 'iter', data: trace[trace.length - 1] };
  }

  if (currentScore.total >= bestScore.total) {
    bestText = currentDraft;
    bestSpans = currentSpans;
    bestScore = currentScore;
  }

  const genericScore = computeHardSubScores(generic, baseline, sampleBodies, sourceText, jieba);

  const final: VoiceFillFinal = {
    generic,
    voice: bestText,
    voiceSpans: bestSpans,
    voiceScore: bestScore,
    genericScore,
    trace,
    voiceSources: samples.map((s) => ({ id: s.id, title: s.title, date: s.date })),
  };
  yield { event: 'final', data: final };
}
