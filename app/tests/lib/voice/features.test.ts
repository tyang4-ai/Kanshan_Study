import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import {
  splitSentences,
  avgSentenceLength,
  sentenceLengthCV,
  paragraphLengthCV,
  idiomDensity,
  genericFunctionWordRate,
  rhetoricalQuestionRate,
  citationDensity,
  classifyOpening,
  extractFeatures,
  createJieba,
} from '@/lib/voice/features';
import type { Jieba } from '@node-rs/jieba';

let jieba: Jieba;

beforeAll(() => {
  jieba = createJieba();
});

describe('splitSentences', () => {
  it('splits on Chinese full-width terminators', () => {
    expect(splitSentences('这是第一句。这是第二句！')).toHaveLength(2);
  });

  it('splits on question mark too', () => {
    expect(splitSentences('为什么呢？因为这样。')).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(splitSentences('')).toEqual([]);
  });

  it('handles single sentence with no terminator', () => {
    const result = splitSentences('这是一个没有标点的句子');
    expect(result).toHaveLength(1);
  });

  it('does not split on decimal points like 3.14', () => {
    const result = splitSentences('圆周率是 3.14 这是个常数。');
    expect(result).toHaveLength(1);
  });
});

describe('avgSentenceLength', () => {
  it('returns mean character count', () => {
    expect(avgSentenceLength(['ab', 'cdef'])).toBe(3);
  });

  it('returns 0 for empty array', () => {
    expect(avgSentenceLength([])).toBe(0);
  });
});

describe('sentenceLengthCV', () => {
  it('returns 0 for uniform-length sentences', () => {
    expect(sentenceLengthCV(['abc', 'def', 'ghi'])).toBe(0);
  });

  it('returns positive value for varied sentences', () => {
    const cv = sentenceLengthCV(['a', 'abcdefghij']);
    expect(cv).toBeGreaterThan(0);
  });

  it('returns 0 for empty or single-element', () => {
    expect(sentenceLengthCV([])).toBe(0);
    expect(sentenceLengthCV(['only one'])).toBe(0);
  });

  it('matches expected value within tolerance', () => {
    const cv = sentenceLengthCV(['ab', 'abcd', 'abcdef', 'abcdefgh']);
    expect(cv).toBeCloseTo(0.4472, 2);
  });
});

describe('paragraphLengthCV', () => {
  it('returns 0 for uniform paragraphs', () => {
    expect(paragraphLengthCV(['abc', 'def'])).toBe(0);
  });

  it('returns positive for varied paragraphs', () => {
    expect(paragraphLengthCV(['a', 'aaaaaaaaaa'])).toBeGreaterThan(0);
  });
});

describe('idiomDensity', () => {
  it('counts known 4-char idioms', () => {
    const density = idiomDensity('这件事真是事半功倍而且众所周知。', jieba);
    expect(density).toBeGreaterThan(0);
  });

  it('does not count non-idiom 4-char sequences', () => {
    const density = idiomDensity('这是普通文本，没有任何成语在里面。', jieba);
    expect(density).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(idiomDensity('', jieba)).toBe(0);
  });
});

describe('genericFunctionWordRate', () => {
  it('catches enumeration scaffolds', () => {
    const rate = genericFunctionWordRate('首先这样，其次那样，最后总结。');
    expect(rate).toBeGreaterThan(0);
  });

  it('catches 众所周知', () => {
    expect(genericFunctionWordRate('众所周知，这是常识。')).toBeGreaterThan(0);
  });

  it('returns 0 for clean prose', () => {
    expect(genericFunctionWordRate('这是一段干净的文字，没有套话。')).toBe(0);
  });
});

describe('rhetoricalQuestionRate', () => {
  it('counts ？ marks', () => {
    expect(rhetoricalQuestionRate('真的吗？为什么呢？')).toBeGreaterThan(0);
  });

  it('returns 0 for declarative text', () => {
    expect(rhetoricalQuestionRate('这是陈述句。')).toBe(0);
  });
});

describe('citationDensity', () => {
  it('counts numeric brackets', () => {
    expect(citationDensity('如 [1] 和 [23] 所示。')).toBeGreaterThan(0);
  });

  it('counts vault-style brackets', () => {
    expect(citationDensity('参见 [v1] 和 [v42]。')).toBeGreaterThan(0);
  });

  it('counts handle-style brackets', () => {
    expect(citationDensity('引用 [@guwanxi] 的观点。')).toBeGreaterThan(0);
  });

  it('counts author-year style', () => {
    expect(citationDensity('Aerts (Aerts 2014) 提出。')).toBeGreaterThan(0);
  });

  it('returns 0 for plain text', () => {
    expect(citationDensity('这段话没有任何引用。')).toBe(0);
  });
});

describe('classifyOpening', () => {
  it('classifies rhetorical question', () => {
    expect(classifyOpening('为什么影像和基因之间会有联系？')).toBe('rhetoricalQuestion');
  });

  it('classifies first-person anecdote', () => {
    expect(classifyOpening('我做过最贵的一次实验是肿瘤放射基因组学。')).toBe(
      'firstPersonAnecdote',
    );
  });

  it('classifies specific fact with year', () => {
    expect(classifyOpening('2024 年起，影像组学领域出现了一个转向。')).toBe('specificFact');
  });

  it('classifies general claim', () => {
    expect(classifyOpening('众所周知，AI 不会取代医生。')).toBe('generalClaim');
  });

  it('classifies enumeration', () => {
    expect(classifyOpening('首先，我们要明确问题的边界。')).toBe('enumeration');
  });

  it('classifies fallback case', () => {
    expect(classifyOpening('这是一个平实的开头。')).toBe('other');
  });
});

describe('extractFeatures — round-trip on real article', () => {
  const articlePath = join(
    __dirname,
    '../../../content/corpus/guwanxi/articles/01-imaging-genomics-turn.md',
  );

  it('produces complete VoiceFeatures shape from a real article', () => {
    const raw = readFileSync(articlePath, 'utf8');
    const { content } = matter(raw);
    const features = extractFeatures([{ id: 'test', body: content }], jieba);

    expect(features.charCount).toBeGreaterThan(2000);
    expect(features.sentenceCount).toBeGreaterThan(20);
    expect(features.avgSentenceLength).toBeGreaterThan(0);
    expect(features.openingDistribution).toHaveProperty('rhetoricalQuestion');
    expect(features.openingDistribution).toHaveProperty('firstPersonAnecdote');
    expect(features.openingDistribution).toHaveProperty('specificFact');
  });

  it('article 01 hits the register-lock thresholds', () => {
    const raw = readFileSync(articlePath, 'utf8');
    const { content } = matter(raw);
    const features = extractFeatures([{ id: 'test', body: content }], jieba);

    expect(features.sentenceLengthCV).toBeGreaterThanOrEqual(0.4);
    expect(features.genericFunctionWordRate).toBeLessThanOrEqual(2);
    expect(features.idiomDensity).toBeLessThanOrEqual(2.5);
  });

  it('aggregates over multiple articles', () => {
    const raw = readFileSync(articlePath, 'utf8');
    const { content } = matter(raw);
    const single = extractFeatures([{ id: 'a', body: content }], jieba);
    const doubled = extractFeatures(
      [{ id: 'a', body: content }, { id: 'b', body: content }],
      jieba,
    );
    expect(doubled.charCount).toBeGreaterThan(single.charCount);
  });

  it('handles empty article list', () => {
    const features = extractFeatures([], jieba);
    expect(features.charCount).toBe(0);
    expect(features.sentenceCount).toBe(0);
  });
});
