import { describe, it, expect } from 'vitest';
import { chunkMarkdown } from '@/lib/vault/chunker';

const MIN = 80;
const MAX = 800;

describe('chunkMarkdown', () => {
  it('returns [] for empty input', () => {
    expect(chunkMarkdown('')).toEqual([]);
  });

  it('drops a single paragraph below MIN (80)', () => {
    const tiny = '太短了。';
    expect(chunkMarkdown(tiny)).toEqual([]);
  });

  it('joins sequential small paragraphs into a single chunk', () => {
    const p = 'a'.repeat(100);
    const input = [p, p, p].join('\n\n');
    const out = chunkMarkdown(input);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe([p, p, p].join('\n\n'));
    expect(out[0].length).toBeGreaterThanOrEqual(MIN);
    expect(out[0].length).toBeLessThanOrEqual(MAX);
  });

  it('joins 3 medium paragraphs and preserves total content size', () => {
    const p1 = 'A'.repeat(200);
    const p2 = 'B'.repeat(200);
    const p3 = 'C'.repeat(200);
    const input = [p1, p2, p3].join('\n\n');
    const out = chunkMarkdown(input);
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out.length).toBeLessThanOrEqual(3);
    const totalContent = out.join('').replace(/\n/g, '').length;
    const inputContent = input.replace(/\n/g, '').length;
    expect(totalContent).toBe(inputContent);
  });

  it('splits a huge paragraph (>MAX) on Chinese sentence boundaries', () => {
    const sentence = '这是一段很长的中文句子用来填充字符数量以便触发分句逻辑。'.repeat(8);
    const huge = sentence + '另一句话！' + sentence + '再来一句？' + sentence + '继续填充内容。' + sentence + '最后一句！';
    expect(huge.length).toBeGreaterThan(MAX);
    const out = chunkMarkdown(huge);
    expect(out.length).toBeGreaterThan(1);
    for (const c of out) {
      expect(c.length).toBeGreaterThanOrEqual(MIN);
      expect(c.length).toBeLessThanOrEqual(MAX);
    }
  });

  it('preserves Chinese punctuation in chunks', () => {
    const text = '段落一。这里有句号！还有感叹号？还有问号。'.repeat(20);
    const out = chunkMarkdown(text);
    const joined = out.join('');
    expect(joined).toContain('。');
    expect(joined).toContain('！');
    expect(joined).toContain('？');
  });

  it('emits a paragraph just over MAX with no sentence boundary as its own chunk if >= MIN', () => {
    // No 。！？ in the body — nothing to split on.
    const lone = 'a'.repeat(MAX + 50);
    const out = chunkMarkdown(lone);
    // Sentence-split path: single "sentence" of length MAX+50, sbuf grows to that, then pushed at end.
    expect(out).toHaveLength(1);
    expect(out[0].length).toBe(MAX + 50);
  });
});
