import type { Jieba } from './features';

const HAN = /^[一-鿿]+$/;
const HAN_OR_LATIN_NOUN = /^[一-鿿\w-]+$/;

const STOPWORDS: ReadonlySet<string> = new Set([
  '我们', '他们', '她们', '它们', '自己', '什么', '怎么', '为什么', '因为',
  '所以', '但是', '然而', '可是', '虽然', '尽管', '不过', '不仅', '而且',
  '以及', '或者', '还是', '一些', '一种', '一个', '一下', '一直', '一定',
  '一样', '一旦', '一起', '一般', '一切', '这种', '这个', '这些', '那种',
  '那个', '那些', '其中', '其他', '另外', '此外', '同时', '现在', '当时',
  '已经', '正在', '即将', '可能', '应该', '必须', '需要', '能够', '可以',
  '主要', '通常', '常常', '经常', '总是', '从来', '已经', '不再', '不会',
  '没有', '不是', '就是', '还有', '只是', '只有', '只能', '只要', '认为',
  '觉得', '看到', '看来', '说明', '表示', '显示', '反映', '体现', '存在',
  '具有', '包括', '包含', '涉及', '关于', '对于', '由于', '根据', '通过',
  '从而', '因此', '于是', '所谓', '即使', '虽然', '如果', '假如', '比如',
  '例如', '譬如', '说来', '看来', '总的', '整个', '整体', '部分', '某些',
  '若干', '许多', '不少', '众多', '无数', '若是', '甚至', '尤其', '特别',
  '特殊', '一定', '某种', '某个', '该项', '该条', '该等', '本文', '本段',
]);

/**
 * Extract key Chinese-noun-shaped terms from a paragraph for must-preserve / scope-fidelity checks.
 * - jieba-tokenized
 * - keeps ≥ 2-char tokens that are pure Han (or Han+Latin technical notation like "AUC")
 * - drops stopwords + pure numerals
 * - dedupes; preserves source order; caps at MAX_TERMS
 *
 * Used by the drafter prompt (must-preserve list) and by scopeFidelityScore (Jaccard).
 */
const MAX_TERMS = 30;

export function extractKeyTerms(text: string, jieba: Jieba): string[] {
  if (!text) return [];
  const merged = mergeAdjacentSingleHan(jieba.cut(text));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of merged) {
    const t = raw.trim();
    if (t.length < 2) continue;
    if (STOPWORDS.has(t)) continue;
    if (/^\d+$/.test(t)) continue;
    if (!HAN.test(t) && !HAN_OR_LATIN_NOUN.test(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_TERMS) break;
  }
  return out;
}

/**
 * Glue runs of single-char Chinese tokens into ≥2-char compounds. Jieba splits
 * compound technical terms like "小波系数" into ["小", "波", "系数"]; we want
 * ["小波", "系数"] so the must-preserve list catches "小波" as a unit.
 */
function mergeAdjacentSingleHan(tokens: string[]): string[] {
  const out: string[] = [];
  let buf = '';
  for (const t of tokens) {
    if (t.length === 1 && HAN.test(t)) {
      buf += t;
      continue;
    }
    if (buf.length > 0) {
      out.push(buf);
      buf = '';
    }
    out.push(t);
  }
  if (buf.length > 0) out.push(buf);
  return out;
}

/** Jaccard similarity of two term sets. Used for deterministic scope-fidelity. */
export function nounJaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

const CITATION_RE = /(\[\d+\]|\[v\d+\]|\[@[^\]]+\]|\([A-Za-z][\w-]*\s+\d{4}\))/g;

/**
 * Extract citation markers from text. Supports the project's three citation kinds:
 * - `[N]` web (blue circle)
 * - `[vN]` vault (brown square)
 * - `[@答主]` zhihu (red badge)
 * Plus latin-style `(Author 2024)`. Used for must-preserve list + citationFidelity.
 */
export function extractCitations(text: string): string[] {
  if (!text) return [];
  const matches = text.match(CITATION_RE);
  if (!matches) return [];
  return Array.from(new Set(matches));
}

/**
 * Recall-only metric: of the citations in source, how many appear in output?
 * Drops are bugs; extras (model citing a sample) are not penalized.
 * If source has zero citations, vacuously 1.
 */
export function citationRecall(sourceCitations: string[], outputCitations: string[]): number {
  if (sourceCitations.length === 0) return 1;
  const out = new Set(outputCitations);
  let matched = 0;
  for (const c of sourceCitations) if (out.has(c)) matched++;
  return matched / sourceCitations.length;
}
