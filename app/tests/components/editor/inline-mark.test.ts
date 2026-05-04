import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { InlineMark } from '@/components/editor/InlineMark';

function makeEditor(content?: string): Editor {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return new Editor({
    element: el,
    extensions: [StarterKit, InlineMark],
    content: content ?? '<p></p>',
  });
}

describe('InlineMark', () => {
  it('parses span[data-mark-kind] with hint and round-trips kind+hint', () => {
    const editor = makeEditor(
      '<p><span data-mark-kind="ai-touched" data-mark-hint="x">hello</span></p>',
    );
    const html = editor.getHTML();
    expect(html).toContain('data-mark-kind="ai-touched"');
    expect(html).toContain('data-mark-hint="x"');
    expect(html).toContain('title="x"');
    expect(html).toContain('hello');
    editor.destroy();
  });

  it('parses without data-mark-hint and emits no title attr', () => {
    const editor = makeEditor('<p><span data-mark-kind="claim">flagged</span></p>');
    const html = editor.getHTML();
    expect(html).toContain('data-mark-kind="claim"');
    expect(html).not.toContain('title=');
    expect(html).not.toContain('data-mark-hint');
    editor.destroy();
  });

  it('setInlineMark applies the mark on selection', () => {
    const editor = makeEditor('<p>hello</p>');
    editor.commands.selectAll();
    editor.commands.setInlineMark({ kind: 'claim', hint: 'flagged' });
    const html = editor.getHTML();
    expect(html).toContain('data-mark-kind="claim"');
    expect(html).toContain('data-mark-hint="flagged"');
    editor.destroy();
  });

  it('unsetInlineMark removes the mark', () => {
    const editor = makeEditor(
      '<p><span data-mark-kind="hedge" data-mark-hint="soft">word</span></p>',
    );
    editor.commands.selectAll();
    editor.commands.unsetInlineMark();
    const html = editor.getHTML();
    expect(html).not.toContain('data-mark-kind');
    expect(html).not.toContain('data-mark-hint');
    editor.destroy();
  });

  it('rendered HTML carries class inline-mark-{kind}', () => {
    const editor = makeEditor('<p><span data-mark-kind="ai-touched">x</span></p>');
    const html = editor.getHTML();
    expect(html).toContain('class="inline-mark-ai-touched"');
    editor.destroy();
  });
});
