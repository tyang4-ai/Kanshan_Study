// Tests for Obsidian-style markdown rendering (Parts 1-4 of the plan).
// Uses direct ProseMirror transactions (tr.insertText) instead of setContent
// to bypass tiptap-markdown's parser — we want to test reflow on raw text
// that the input rule did NOT catch.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { useEditorStore } from '@/lib/store/editor';
import {
  matchBlockPrefix,
  scanInlineMarkdown,
  hasMarkdownSyntax,
  reflowBlockAt,
  blockStartFromSelection,
} from '@/components/editor/markdown-reflow';
import type { Editor } from '@tiptap/react';

const openTabMock = vi.fn();
vi.mock('@/lib/store/floating-window', () => ({
  useFloatingWindowStore: Object.assign(
    (selector: (s: { openTab: typeof openTabMock }) => unknown) =>
      selector({ openTab: openTabMock }),
    { getState: () => ({ openTab: openTabMock }) },
  ),
}));

async function mountEditor(initialHtml = '<p></p>'): Promise<Editor> {
  render(<TipTapEditor content={initialHtml} />);
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 10));
    const e = useEditorStore.getState().editor;
    if (e) return e;
  }
  throw new Error('editor did not mount');
}

/**
 * Replace the doc with a single paragraph containing literal `text`. Uses a
 * transaction so we bypass tiptap-markdown's parser entirely — we want the
 * paragraph to contain raw markdown characters that reflow has to handle.
 */
function putParagraph(editor: Editor, text: string): void {
  const schema = editor.state.schema;
  const para = schema.nodes.paragraph.create(null, text ? schema.text(text) : null);
  const tr = editor.state.tr.replaceWith(0, editor.state.doc.content.size, para);
  editor.view.dispatch(tr);
}

beforeEach(() => {
  useEditorStore.setState({ editor: null });
  openTabMock.mockClear();
});
afterEach(() => cleanup());

describe('markdown pattern helpers', () => {
  it('matchBlockPrefix detects heading levels 1..6', () => {
    expect(matchBlockPrefix('# foo')).toEqual({ kind: 'heading', level: 1, text: 'foo' });
    expect(matchBlockPrefix('### bar')).toEqual({ kind: 'heading', level: 3, text: 'bar' });
    expect(matchBlockPrefix('###### baz')).toEqual({ kind: 'heading', level: 6, text: 'baz' });
  });

  it('matchBlockPrefix detects blockquote / lists / hr', () => {
    expect(matchBlockPrefix('> wisdom')?.kind).toBe('blockquote');
    expect(matchBlockPrefix('- item')?.kind).toBe('bulletList');
    expect(matchBlockPrefix('1. item')?.kind).toBe('orderedList');
    expect(matchBlockPrefix('---')?.kind).toBe('horizontalRule');
  });

  it('matchBlockPrefix returns null for plain text', () => {
    expect(matchBlockPrefix('just a paragraph')).toBeNull();
    expect(matchBlockPrefix('')).toBeNull();
  });

  it('scanInlineMarkdown finds bold / italic / code / link', () => {
    const ranges = scanInlineMarkdown('hi **world** and *soft* and `code` and [foo](https://bar)');
    const kinds = ranges.map((r) => r.mark);
    expect(kinds).toContain('bold');
    expect(kinds).toContain('italic');
    expect(kinds).toContain('code');
    expect(kinds).toContain('link');
  });

  it('scanInlineMarkdown does NOT confuse ** for italic', () => {
    const ranges = scanInlineMarkdown('this is **bold** not italic');
    expect(ranges.filter((r) => r.mark === 'italic')).toHaveLength(0);
    expect(ranges.filter((r) => r.mark === 'bold')).toHaveLength(1);
  });

  it('hasMarkdownSyntax is a cheap pre-filter', () => {
    expect(hasMarkdownSyntax('# heading')).toBe(true);
    expect(hasMarkdownSyntax('**bold**')).toBe(true);
    expect(hasMarkdownSyntax('plain text')).toBe(false);
  });
});

describe('reflowBlockAt — block-level transforms', () => {
  it('paragraph `# foo` → heading on reflow', async () => {
    const editor = await mountEditor();
    putParagraph(editor, '# foo');
    expect(editor.state.doc.firstChild?.type.name).toBe('paragraph');
    const changed = reflowBlockAt(editor, 0);
    expect(changed).toBe(true);
    expect(editor.state.doc.firstChild?.type.name).toBe('heading');
    expect(editor.state.doc.firstChild?.attrs.level).toBe(1);
    expect(editor.state.doc.firstChild?.textContent).toBe('foo');
  });

  it('paragraph `## bar` → heading level 2', async () => {
    const editor = await mountEditor();
    putParagraph(editor, '## bar');
    reflowBlockAt(editor, 0);
    expect(editor.state.doc.firstChild?.type.name).toBe('heading');
    expect(editor.state.doc.firstChild?.attrs.level).toBe(2);
  });

  it('paragraph `> wisdom` → blockquote', async () => {
    const editor = await mountEditor();
    putParagraph(editor, '> wisdom');
    reflowBlockAt(editor, 0);
    expect(editor.state.doc.firstChild?.type.name).toBe('blockquote');
  });

  it('paragraph `- item` → bulletList', async () => {
    const editor = await mountEditor();
    putParagraph(editor, '- item');
    reflowBlockAt(editor, 0);
    expect(editor.state.doc.firstChild?.type.name).toBe('bulletList');
  });

  it('paragraph `1. item` → orderedList', async () => {
    const editor = await mountEditor();
    putParagraph(editor, '1. item');
    reflowBlockAt(editor, 0);
    expect(editor.state.doc.firstChild?.type.name).toBe('orderedList');
  });

  it('paragraph `---` → horizontalRule', async () => {
    const editor = await mountEditor();
    putParagraph(editor, '---');
    reflowBlockAt(editor, 0);
    expect(editor.state.doc.firstChild?.type.name).toBe('horizontalRule');
  });
});

describe('reflowBlockAt — inline marks', () => {
  it('paragraph `hi **world**` gains a bold mark on reflow', async () => {
    const editor = await mountEditor();
    putParagraph(editor, 'hi **world**');
    const changed = reflowBlockAt(editor, 0);
    expect(changed).toBe(true);
    const para = editor.state.doc.firstChild;
    let foundBold = false;
    para?.descendants((node) => {
      if (node.isText && node.marks.some((m) => m.type.name === 'bold')) {
        foundBold = true;
      }
    });
    expect(foundBold).toBe(true);
    expect(para?.textContent.includes('**')).toBe(false);
  });

  it('paragraph `before *em* after` gains an italic mark', async () => {
    const editor = await mountEditor();
    putParagraph(editor, 'before *em* after');
    reflowBlockAt(editor, 0);
    const para = editor.state.doc.firstChild;
    let foundItalic = false;
    para?.descendants((node) => {
      if (node.isText && node.marks.some((m) => m.type.name === 'italic')) {
        foundItalic = true;
      }
    });
    expect(foundItalic).toBe(true);
  });

  it('paragraph with `[text](url)` gains a link mark', async () => {
    const editor = await mountEditor();
    putParagraph(editor, '看 [示例](https://example.com) 一下');
    reflowBlockAt(editor, 0);
    const para = editor.state.doc.firstChild;
    let linkHref: string | null = null;
    para?.descendants((node) => {
      const link = node.marks.find((m) => m.type.name === 'link');
      if (link) linkHref = (link.attrs as { href?: string }).href ?? null;
    });
    expect(linkHref).toBe('https://example.com');
  });
});

describe('reflowBlockAt — skip conditions', () => {
  it('paragraph with inlineMark stays unchanged', async () => {
    const html = '<p><span data-mark-kind="ai-touched" data-mark-hint="x"># foo</span> rest</p>';
    const editor = await mountEditor(html);
    const before = editor.getHTML();
    reflowBlockAt(editor, 0);
    expect(editor.getHTML()).toBe(before);
  });

  it('non-paragraph block (heading) is left alone', async () => {
    const editor = await mountEditor('<h1>already heading</h1>');
    const before = editor.getHTML();
    reflowBlockAt(editor, 0);
    expect(editor.getHTML()).toBe(before);
  });

  it('reflow no-ops on IME composition', async () => {
    const editor = await mountEditor();
    putParagraph(editor, '# foo');
    const before = editor.getHTML();
    Object.defineProperty(editor.view, 'composing', { value: true, configurable: true });
    reflowBlockAt(editor, 0);
    expect(editor.getHTML()).toBe(before);
    Object.defineProperty(editor.view, 'composing', { value: false, configurable: true });
  });

  it('reflow no-ops on plain text', async () => {
    const editor = await mountEditor();
    putParagraph(editor, 'just regular text');
    expect(reflowBlockAt(editor, 0)).toBe(false);
  });

  it('reflow no-ops on null pos', async () => {
    const editor = await mountEditor();
    expect(reflowBlockAt(editor, null)).toBe(false);
  });
});

describe('markdown round-trip (Part 6)', () => {
  it('`# foo` paragraph → reflow → getMarkdown produces `# foo`', async () => {
    const editor = await mountEditor();
    putParagraph(editor, '# foo');
    reflowBlockAt(editor, 0);
    type WithMarkdown = { storage: { markdown?: { getMarkdown(): string } } };
    const md = (editor as unknown as WithMarkdown).storage.markdown?.getMarkdown() ?? '';
    expect(md.trim()).toBe('# foo');
  });

  it('`> wisdom` paragraph → reflow → getMarkdown produces `> wisdom`', async () => {
    const editor = await mountEditor();
    putParagraph(editor, '> wisdom');
    reflowBlockAt(editor, 0);
    type WithMarkdown = { storage: { markdown?: { getMarkdown(): string } } };
    const md = (editor as unknown as WithMarkdown).storage.markdown?.getMarkdown() ?? '';
    expect(md.trim()).toMatch(/^> wisdom/);
  });
});

describe('blockStartFromSelection', () => {
  it('returns the block start for the cursor position', async () => {
    const editor = await mountEditor();
    // Build two paragraphs by transaction so we know exact positions.
    const schema = editor.state.schema;
    const p1 = schema.nodes.paragraph.create(null, schema.text('foo'));
    const p2 = schema.nodes.paragraph.create(null, schema.text('bar'));
    const tr = editor.state.tr.replaceWith(0, editor.state.doc.content.size, [p1, p2]);
    editor.view.dispatch(tr);

    // Move cursor inside the second paragraph.
    editor.commands.setTextSelection(7);
    const pos = blockStartFromSelection(editor);
    // First paragraph spans positions 0..5 (5 = end). Second paragraph starts at 5.
    expect(pos).toBe(5);
  });
});
