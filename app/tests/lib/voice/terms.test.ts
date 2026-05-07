import { describe, it, expect } from 'vitest';
import { extractKeyTerms, nounJaccard, extractCitations, citationRecall } from '@/lib/voice/terms';
import { createJieba } from '@/lib/voice/features';

const jieba = createJieba();

describe('extractKeyTerms', () => {
  it('keeps domain nouns ≥ 2 chars', () => {
    const out = extractKeyTerms(
      '影像组学的主流路径是「特征工程」：从 CT、MRI 中提取小波系数。',
      jieba,
    );
    expect(out).toContain('影像');
    expect(out).toContain('小波');
    expect(out).toContain('系数');
  });

  it('drops stopwords', () => {
    const out = extractKeyTerms(
      '我们认为这种方法具有重要的意义，因为它能够解决问题。',
      jieba,
    );
    expect(out).not.toContain('我们');
    expect(out).not.toContain('因为');
    expect(out).not.toContain('能够');
    expect(out).not.toContain('这种');
  });

  it('drops pure numerals', () => {
    const out = extractKeyTerms('2024 年发表了 873 篇论文。', jieba);
    expect(out).not.toContain('2024');
    expect(out).not.toContain('873');
  });

  it('returns [] on empty input', () => {
    expect(extractKeyTerms('', jieba)).toEqual([]);
  });

  it('dedupes', () => {
    const out = extractKeyTerms('影像组学影像组学影像组学', jieba);
    const counts = out.filter((t) => t === '影像').length;
    expect(counts).toBeLessThanOrEqual(1);
  });

  it('caps at 30 terms', () => {
    const text = Array.from({ length: 100 }, (_, i) => `术语${i}`).join('，');
    const out = extractKeyTerms(text, jieba);
    expect(out.length).toBeLessThanOrEqual(30);
  });

  it('filters non-Chinese pure-symbol tokens', () => {
    const out = extractKeyTerms('专家说：「这就是答案。」', jieba);
    expect(out.every((t) => /[一-鿿]/.test(t))).toBe(true);
  });
});

describe('nounJaccard', () => {
  it('identical sets → 1', () => {
    expect(nounJaccard(['影像', '组学'], ['影像', '组学'])).toBe(1);
  });

  it('no overlap → 0', () => {
    expect(nounJaccard(['影像', '组学'], ['基因', '通路'])).toBe(0);
  });

  it('half overlap → 1/3', () => {
    // {A, B} vs {B, C} → inter 1, union 3
    expect(nounJaccard(['A', 'B'], ['B', 'C'])).toBeCloseTo(1 / 3, 5);
  });

  it('both empty → 1 (degenerate but defined)', () => {
    expect(nounJaccard([], [])).toBe(1);
  });

  it('one empty → 0', () => {
    expect(nounJaccard(['A'], [])).toBe(0);
  });
});

describe('extractCitations', () => {
  it('extracts all three citation kinds', () => {
    const text = '基因组学锚点[3]、向量[v7]、答主[@冷泉]都该保留。';
    const out = extractCitations(text);
    expect(out).toContain('[3]');
    expect(out).toContain('[v7]');
    expect(out).toContain('[@冷泉]');
  });

  it('extracts latin parenthetical citations', () => {
    // Project's CITATION_RE format: `(<single-token-author> <year>)` — used in
    // Chinese prose where the author's name appears inside the parens.
    const out = extractCitations('影像组学领域 (Aerts 2014) 提出 NCOMM 路径。');
    expect(out).toContain('(Aerts 2014)');
  });

  it('returns [] when no citations', () => {
    expect(extractCitations('一段普通中文。')).toEqual([]);
  });

  it('dedupes repeats', () => {
    expect(extractCitations('[3] 和 [3] 是同一个引用。')).toEqual(['[3]']);
  });
});

describe('citationRecall', () => {
  it('all preserved → 1', () => {
    expect(citationRecall(['[3]', '[v7]'], ['[3]', '[v7]', '[12]'])).toBe(1);
  });

  it('one dropped of two → 0.5', () => {
    expect(citationRecall(['[3]', '[v7]'], ['[3]'])).toBe(0.5);
  });

  it('all dropped → 0', () => {
    expect(citationRecall(['[3]', '[v7]'], [])).toBe(0);
  });

  it('source has none → vacuously 1', () => {
    expect(citationRecall([], ['[3]'])).toBe(1);
  });

  it('extras in output do not penalize (recall, not precision)', () => {
    expect(citationRecall(['[3]'], ['[3]', '[v9]', '[v12]'])).toBe(1);
  });

  it('drift case: source about radiomics, draft about genomics → low Jaccard', () => {
    const source = extractKeyTerms(
      '影像组学的主流路径是特征工程，从 CT、MRI 中提取量化特征用于诊断分级。',
      jieba,
    );
    const draft = extractKeyTerms(
      '基因组学融合带来了拓扑同构的表示学习问题，对模型可解释性提出更高要求。',
      jieba,
    );
    expect(nounJaccard(source, draft)).toBeLessThan(0.4);
  });
});
