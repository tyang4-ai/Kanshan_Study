// Tests for Part 7 — true Obsidian Live Preview decoration plugin.
// Build the doc via direct ProseMirror transactions to bypass:
//   (a) the tiptap-markdown parser intercepting setContent, AND
//   (b) the editor-tabs store sync that replaces our initial content with the
//       demo seed doc on mount.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { useEditorStore } from '@/lib/store/editor';
import type { Editor } from '@tiptap/react';

const openTabMock = vi.fn();
vi.mock('@/lib/store/floating-window', () => ({
  useFloatingWindowStore: Object.assign(
    (selector: (s: { openTab: typeof openTabMock }) => unknown) =>
      selector({ openTab: openTabMock }),
    { getState: () => ({ openTab: openTabMock }) },
  ),
}));

async function mountEditor(): Promise<Editor> {
  render(<TipTapEditor content="<p></p>" />);
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 10));
    const e = useEditorStore.getState().editor;
    if (e) return e;
  }
  throw new Error('editor did not mount');
}

/** Replace the doc with a single heading of the given level + text. */
function putHeading(editor: Editor, level: number, text: string): void {
  const { schema, doc } = editor.state;
  const node = schema.nodes.heading.create({ level }, schema.text(text));
  editor.view.dispatch(editor.state.tr.replaceWith(0, doc.content.size, node));
}

/** Replace the doc with a single blockquote wrapping a paragraph. */
function putBlockquote(editor: Editor, text: string): void {
  const { schema, doc } = editor.state;
  const para = schema.nodes.paragraph.create(null, schema.text(text));
  const node = schema.nodes.blockquote.create(null, para);
  editor.view.dispatch(editor.state.tr.replaceWith(0, doc.content.size, node));
}

/** Replace the doc with a single bullet list containing one item. */
function putBulletList(editor: Editor, text: string): void {
  const { schema, doc } = editor.state;
  const para = schema.nodes.paragraph.create(null, schema.text(text));
  const item = schema.nodes.listItem.create(null, para);
  const list = schema.nodes.bulletList.create(null, item);
  editor.view.dispatch(editor.state.tr.replaceWith(0, doc.content.size, list));
}

/** Replace the doc with a paragraph containing text and a bold mark range. */
function putParagraphWithBold(editor: Editor, before: string, bold: string, after: string): void {
  const { schema, doc } = editor.state;
  const boldMark = schema.marks.bold.create();
  const nodes: ReturnType<typeof schema.text>[] = [];
  if (before) nodes.push(schema.text(before));
  if (bold) nodes.push(schema.text(bold, [boldMark]));
  if (after) nodes.push(schema.text(after));
  const para = schema.nodes.paragraph.create(null, nodes);
  editor.view.dispatch(editor.state.tr.replaceWith(0, doc.content.size, para));
}

/** Returns the text content of every `.kanshan-md-token` widget currently
 *  rendered in the editor DOM. */
function widgetTexts(editor: Editor): string[] {
  const root = editor.view.dom;
  const widgets = root.querySelectorAll('.kanshan-md-token');
  return Array.from(widgets).map((w) => w.textContent ?? '');
}

beforeEach(() => {
  useEditorStore.setState({ editor: null });
  openTabMock.mockClear();
});
afterEach(() => cleanup());

describe('LivePreview decoration plugin', () => {
  it('shows `# ` widget when caret is inside an H1', async () => {
    const editor = await mountEditor();
    putHeading(editor, 1, 'foo');
    editor.commands.setTextSelection(2);
    const widgets = widgetTexts(editor);
    expect(widgets.some((t) => t === '# ')).toBe(true);
  });

  it('shows `## ` widget when caret is inside an H2', async () => {
    const editor = await mountEditor();
    putHeading(editor, 2, 'bar');
    editor.commands.setTextSelection(2);
    const widgets = widgetTexts(editor);
    expect(widgets.some((t) => t === '## ')).toBe(true);
  });

  it('hides heading widget when caret is in a different block', async () => {
    const editor = await mountEditor();
    const { schema, doc } = editor.state;
    const h1 = schema.nodes.heading.create({ level: 1 }, schema.text('foo'));
    const p = schema.nodes.paragraph.create(null, schema.text('body'));
    editor.view.dispatch(editor.state.tr.replaceWith(0, doc.content.size, [h1, p]));

    // Move cursor into the paragraph below the heading.
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    const widgets = widgetTexts(editor);
    expect(widgets.some((t) => t === '# ')).toBe(false);
  });

  it('shows `**` widgets when caret is inside a bold range', async () => {
    const editor = await mountEditor();
    putParagraphWithBold(editor, 'hi ', 'world', '');
    // Bold mark covers "world" — positions 4..9. Cursor at 6 is inside.
    editor.commands.setTextSelection(6);
    const widgets = widgetTexts(editor);
    expect(widgets.filter((t) => t === '**').length).toBe(2);
  });

  it('does NOT show widget when caret is in an InlineMark range', async () => {
    const editor = await mountEditor();
    const { schema, doc } = editor.state;
    const inlineMark = schema.marks.inlineMark.create({ kind: 'ai-touched', hint: 'x' });
    const text = schema.text('marked text', [inlineMark]);
    const para = schema.nodes.paragraph.create(null, text);
    editor.view.dispatch(editor.state.tr.replaceWith(0, doc.content.size, para));
    editor.commands.setTextSelection(3);
    const widgets = widgetTexts(editor);
    expect(widgets.some((t) => t === '**' || t === '*' || t === '`')).toBe(false);
  });

  it('shows `> ` widget when caret is inside a blockquote', async () => {
    const editor = await mountEditor();
    putBlockquote(editor, 'wisdom');
    editor.commands.setTextSelection(3);
    const widgets = widgetTexts(editor);
    expect(widgets.some((t) => t === '> ')).toBe(true);
  });

  it('shows `- ` widget when caret is inside a bullet list item', async () => {
    const editor = await mountEditor();
    putBulletList(editor, 'first');
    editor.commands.setTextSelection(4);
    const widgets = widgetTexts(editor);
    expect(widgets.some((t) => t === '- ')).toBe(true);
  });
});
