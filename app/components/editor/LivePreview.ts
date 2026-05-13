// Obsidian-style Live Preview decoration for the TipTap editor.
//
// What it does: when the caret is inside a block that resulted from a markdown
// input rule (heading / blockquote / bullet list / etc.), render dim widget
// decorations that visually re-create the markdown source characters
// (`#`, `##`, `> `, `- `, `**…**`, `*…*`, `` `…` ``, `[…](url)`).
// The decorations vanish the moment the caret leaves the block, so the user
// sees a styled H1 with no `#` once they're done editing — Obsidian Live
// Preview's signature feel.
//
// Important: the underlying ProseMirror doc is unchanged. Widgets are pure
// visual sugar. `editor.storage.markdown.getMarkdown()` round-trip is
// unaffected — TipTap-Markdown serializes the structured nodes, not the
// widgets. Custom marks (InlineMark / MarginSeal / CitationMark / voiceSpan)
// are explicitly skipped — they're not markdown and shouldn't get `**`
// rendered around them.

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';

// Marks whose markdown source SHOULD be re-rendered as widgets.
const MARKDOWN_MARKS = new Set(['bold', 'italic', 'strike', 'code', 'link']);

const MARK_TOKEN: Record<string, string> = {
  bold: '**',
  italic: '*',
  strike: '~~',
  code: '`',
};

interface BlockSpec {
  pos: number;
  size: number;
}

function cursorInsideBlock(state: EditorState, block: BlockSpec): boolean {
  const { from, to } = state.selection;
  return from >= block.pos && to <= block.pos + block.size;
}

/** Build a widget decoration at a given absolute position. `side` controls
 *  whether the widget renders before (-1) or after (+1) when both share the
 *  same position. */
function widgetAt(pos: number, text: string, side: -1 | 1 = -1): Decoration {
  return Decoration.widget(
    pos,
    () => {
      const span = document.createElement('span');
      span.className = 'kanshan-md-token';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = text;
      return span;
    },
    { side },
  );
}

function repeat(s: string, n: number): string {
  let out = '';
  for (let i = 0; i < n; i++) out += s;
  return out;
}

/** Walk a single block (typically a heading / blockquote / listItem / paragraph)
 *  and collect the mark-source widgets that should display when caret is
 *  inside this block. */
function collectInlineMarkWidgets(blockNode: PMNode, blockPos: number): Decoration[] {
  const decorations: Decoration[] = [];
  // Walk text descendants. For each contiguous run of identical markdown
  // marks (e.g. a stretch of bold text), emit widgets at the boundaries.
  // We accumulate marks across adjacent text nodes by tracking active mark
  // ranges; close them when the next text node lacks that mark.
  const openRanges = new Map<string, number>(); // markType -> startPos

  blockNode.descendants((node, relPos) => {
    if (!node.isText) return true;
    const absPos = blockPos + 1 + relPos; // +1 to skip the block's opening token

    // For each markdown mark, see if this text carries it.
    for (const markType of MARKDOWN_MARKS) {
      const hasMark = node.marks.some((m) => m.type.name === markType);
      const wasOpen = openRanges.has(markType);
      if (hasMark && !wasOpen) {
        openRanges.set(markType, absPos);
      } else if (!hasMark && wasOpen) {
        const start = openRanges.get(markType)!;
        openRanges.delete(markType);
        emitMarkBoundaries(decorations, markType, start, absPos);
      }
    }
    return true;
  });

  // Close any ranges still open at end of block.
  if (openRanges.size > 0) {
    const blockEnd = blockPos + blockNode.nodeSize - 1; // before closing token
    for (const [markType, start] of openRanges) {
      emitMarkBoundaries(decorations, markType, start, blockEnd);
    }
  }
  return decorations;
}

function emitMarkBoundaries(
  decorations: Decoration[],
  markType: string,
  start: number,
  end: number,
): void {
  if (markType === 'link') {
    // For links we'd need the href to render `](url)`, but we lost the mark
    // attrs by the time we get here. To keep it simple, just decorate the
    // brackets without the URL.
    decorations.push(widgetAt(start, '[', -1));
    decorations.push(widgetAt(end, '](…)', 1));
    return;
  }
  const tok = MARK_TOKEN[markType];
  if (!tok) return;
  decorations.push(widgetAt(start, tok, -1));
  decorations.push(widgetAt(end, tok, 1));
}

function buildDecorations(state: EditorState): DecorationSet {
  const view = (state as unknown as { __view?: { composing?: boolean } }).__view;
  if (view?.composing) return DecorationSet.empty;

  const decorations: Decoration[] = [];
  state.doc.descendants((node, pos) => {
    const blockSpec = { pos, size: node.nodeSize };
    if (!cursorInsideBlock(state, blockSpec)) {
      // We don't decorate this block, but DO recurse to find nested blocks
      // (e.g. listItems inside a list). Returning true continues descent.
      return true;
    }

    if (node.type.name === 'heading') {
      const level = (node.attrs.level as number) ?? 1;
      decorations.push(widgetAt(pos + 1, repeat('#', level) + ' ', -1));
      // Walk inline marks INSIDE the heading.
      decorations.push(...collectInlineMarkWidgets(node, pos));
      return false;
    }
    if (node.type.name === 'blockquote') {
      // Render `> ` at each paragraph child inside the blockquote.
      const inner = pos + 1;
      node.forEach((child, offset) => {
        if (child.type.name === 'paragraph') {
          decorations.push(widgetAt(inner + offset + 1, '> ', -1));
        }
      });
      // recurse so inline marks inside the paragraphs still get widgets
      return true;
    }
    if (node.type.name === 'listItem') {
      // Token depends on parent: bullet → `- `, ordered → `1. ` (use 1
      // because we don't carry ordinal context cheaply here).
      // Skip the listItem-level decoration if the parent isn't accessible;
      // ProseMirror's iteration gives us the node but not its parent.
      // Use depth heuristic: look at the immediate ancestor via doc.resolve.
      const $pos = state.doc.resolve(pos + 1);
      const parent = $pos.parent;
      const token = parent.type.name === 'orderedList' ? '1. ' : '- ';
      // Widget at the start of the listItem's content (first child's start).
      decorations.push(widgetAt(pos + 2, token, -1));
      return true;
    }
    if (node.type.name === 'paragraph') {
      // Inline marks inside a plain paragraph (when cursor is in it).
      decorations.push(...collectInlineMarkWidgets(node, pos));
      return false;
    }
    if (node.type.name === 'horizontalRule') {
      // HR has no text. Decorate with `---` widget right before.
      decorations.push(widgetAt(pos, '---', -1));
      return false;
    }
    return true;
  });

  return DecorationSet.create(state.doc, decorations);
}

export const livePreviewPluginKey = new PluginKey<DecorationSet>('kanshan-live-preview');

export const LivePreview = Extension.create({
  name: 'kanshanLivePreview',
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: livePreviewPluginKey,
        state: {
          init: (_config, state) => buildDecorations(state),
          apply: (tr, _old, _oldState, newState) => {
            // Rebuild on every selection or doc change. Cheap for typical docs.
            if (!tr.docChanged && !tr.selectionSet) return _old;
            return buildDecorations(newState);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});

export default LivePreview;
