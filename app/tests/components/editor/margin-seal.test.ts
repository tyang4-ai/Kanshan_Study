import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { buildMatches, type MarginSealSeed } from '@/components/editor/margin-seal-from-seeds';

function docFor(html: string) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const editor = new Editor({
    element: el,
    extensions: [StarterKit],
    content: html,
  });
  return { doc: editor.state.doc, editor };
}

describe('buildMatches (MarginSeal seeds)', () => {
  it('happy: 2 demo seeds in doc → 2 matches with from < to', () => {
    const { doc, editor } = docFor(
      '<p>这条路径在某些场景下取得了显著成果，但也暴露出三个结构性问题。</p>' +
        '<p>这种黑盒特性在临床决策场景下是致命的。</p>',
    );
    const seeds: MarginSealSeed[] = [
      { textNeedle: '这条路径在某些场景下取得了显著成果', kind: 'reviewed' },
      { textNeedle: '这种黑盒特性在临床决策场景下是致命的', kind: 'flag' },
    ];
    const matches = buildMatches(doc, seeds);
    expect(matches).toHaveLength(2);
    expect(matches[0].from).toBeLessThan(matches[0].to);
    expect(matches[1].from).toBeLessThan(matches[1].to);
    expect(matches[0].from).toBeLessThan(matches[1].from);
    expect(matches[0].kind).toBe('reviewed');
    expect(matches[1].kind).toBe('flag');
    editor.destroy();
  });

  it('edge: needle missing in doc → 0 matches, no throw', () => {
    const { doc, editor } = docFor('<p>纯文本</p>');
    const seeds: MarginSealSeed[] = [{ textNeedle: '不存在的句子', kind: 'reviewed' }];
    const matches = buildMatches(doc, seeds);
    expect(matches).toHaveLength(0);
    editor.destroy();
  });

  it('edge: same needle appearing twice → 1 match (first-match-wins)', () => {
    const { doc, editor } = docFor('<p>重复句子</p><p>重复句子</p>');
    const seeds: MarginSealSeed[] = [{ textNeedle: '重复句子', kind: 'flag' }];
    const matches = buildMatches(doc, seeds);
    expect(matches).toHaveLength(1);
    editor.destroy();
  });

  it('edge: empty seeds → 0 matches', () => {
    const { doc, editor } = docFor('<p>任意文本</p>');
    const matches = buildMatches(doc, []);
    expect(matches).toHaveLength(0);
    editor.destroy();
  });
});
