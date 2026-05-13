// Obsidian-style "click-away render" block reflow for the TipTap editor.
//
// StarterKit's input rules convert markdown to nodes when the user TYPES the
// trigger sequence (`# foo<space>`, `**bold**`, `- ` at line start). This
// helper covers the cases input rules don't:
//   - User typed `# foo` without trailing space, then clicked elsewhere
//   - User pasted markdown text that the paste rule missed
//   - User edited mid-line and the leading marker got separated
//
// Trigger surface: editor.on('selectionUpdate') in TipTapEditor.tsx tracks the
// previous block's start pos. When the active block changes, call
// `reflowBlockAt(editor, prevBlockPos)`. Pure transforms; no side effects
// beyond the editor's own dispatch.

import type { Editor } from '@tiptap/react';
import type { Node as PMNode } from '@tiptap/pm/model';

// Marks the reflow MUST preserve — these belong to the compliance/citation
// system (InlineMark, MarginSeal, CitationMark) or to 看墨 voice spans. If a
// paragraph contains any of these, leave the whole block alone — reflow could
// strip them. The user can still trigger input rules within those paragraphs
// while typing.
const PROTECTED_MARKS = new Set([
  'inlineMark',
  'marginSeal',
  'citation',
  'voiceSpan',
]);

interface BlockMatch {
  kind: 'heading' | 'blockquote' | 'bulletList' | 'orderedList' | 'horizontalRule';
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}

// Block-level prefix patterns. Tried in order; first match wins.
const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const BLOCKQUOTE_RE = /^>\s+(.+)$/;
const BULLET_RE = /^[-*+]\s+(.+)$/;
const ORDERED_RE = /^\d+\.\s+(.+)$/;
const HR_RE = /^(?:-{3,}|\*{3,}|_{3,})$/;

/** Returns true if `text` looks like it has block-level markdown the input
 *  rule may have missed. Used as a cheap pre-filter before reflow. */
export function hasBlockMarkdown(text: string): boolean {
  if (!text) return false;
  return (
    HEADING_RE.test(text) ||
    BLOCKQUOTE_RE.test(text) ||
    BULLET_RE.test(text) ||
    ORDERED_RE.test(text) ||
    HR_RE.test(text)
  );
}

/** Returns true if `text` looks like it has inline markdown the input rule
 *  may have missed (bold / italic / inline code / link). */
export function hasInlineMarkdown(text: string): boolean {
  if (!text) return false;
  return (
    /\*\*[^*\n]+\*\*/.test(text) ||
    /(^|[^*])\*[^*\n]+\*(?!\*)/.test(text) ||
    /`[^`\n]+`/.test(text) ||
    /\[[^\]\n]+\]\([^)\n]+\)/.test(text)
  );
}

export function hasMarkdownSyntax(text: string): boolean {
  return hasBlockMarkdown(text) || hasInlineMarkdown(text);
}

/** Walk the node's text contents and return true if ANY child has a mark
 *  whose type name is in PROTECTED_MARKS. */
function paragraphHasProtectedMark(node: PMNode): boolean {
  let found = false;
  node.descendants((child) => {
    if (found) return false;
    if (child.marks && child.marks.length > 0) {
      for (const m of child.marks) {
        if (PROTECTED_MARKS.has(m.type.name)) {
          found = true;
          return false;
        }
      }
    }
    return true;
  });
  return found;
}

/** Match a paragraph's text against block-level markdown prefixes.
 *  Returns the kind of transform to apply, or null. */
export function matchBlockPrefix(text: string): BlockMatch | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const headingMatch = HEADING_RE.exec(trimmed);
  if (headingMatch) {
    return {
      kind: 'heading',
      level: headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6,
      text: headingMatch[2].trim(),
    };
  }
  const bqMatch = BLOCKQUOTE_RE.exec(trimmed);
  if (bqMatch) {
    return { kind: 'blockquote', text: bqMatch[1].trim() };
  }
  const bulletMatch = BULLET_RE.exec(trimmed);
  if (bulletMatch) {
    return { kind: 'bulletList', text: bulletMatch[1].trim() };
  }
  const orderedMatch = ORDERED_RE.exec(trimmed);
  if (orderedMatch) {
    return { kind: 'orderedList', text: orderedMatch[1].trim() };
  }
  if (HR_RE.test(trimmed)) {
    return { kind: 'horizontalRule', text: '' };
  }
  return null;
}

interface InlineMarkRange {
  mark: 'bold' | 'italic' | 'code' | 'link';
  start: number;
  end: number;
  text: string;
  href?: string;
}

/** Scan text for inline markdown patterns. Returns ranges in textual offset
 *  (relative to the paragraph's text content), NOT ProseMirror positions. */
export function scanInlineMarkdown(text: string): InlineMarkRange[] {
  const ranges: InlineMarkRange[] = [];
  // Order: code first (greedy backticks can swallow ** inside), then link,
  // then bold, then italic.
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    ranges.push({ mark: 'code', start: m.index!, end: m.index! + m[0].length, text: m[1] });
  }
  for (const m of text.matchAll(/\[([^\]\n]+)\]\(([^)\n]+)\)/g)) {
    ranges.push({ mark: 'link', start: m.index!, end: m.index! + m[0].length, text: m[1], href: m[2] });
  }
  for (const m of text.matchAll(/\*\*([^*\n]+)\*\*/g)) {
    ranges.push({ mark: 'bold', start: m.index!, end: m.index! + m[0].length, text: m[1] });
  }
  // Italic must NOT match the inside of a `**` pair. Use lookbehind/ahead.
  for (const m of text.matchAll(/(?<!\*)\*([^*\n]+)\*(?!\*)/g)) {
    ranges.push({ mark: 'italic', start: m.index!, end: m.index! + m[0].length, text: m[1] });
  }
  // Sort by start asc.
  ranges.sort((a, b) => a.start - b.start);
  return ranges;
}

/** Reflow the block at `blockPos`. Returns true if anything changed. */
export function reflowBlockAt(editor: Editor, blockPos: number | null): boolean {
  if (blockPos == null || blockPos < 0) return false;
  // IME composition guard — clobbering Chinese/Japanese mid-input would be bad.
  if ((editor.view as unknown as { composing?: boolean }).composing) return false;
  if (!editor.isEditable) return false;

  const { state } = editor;
  if (blockPos >= state.doc.content.size) return false;
  const $pos = state.doc.resolve(blockPos);
  const blockNode = $pos.nodeAfter ?? $pos.parent;
  if (!blockNode) return false;
  // Only reflow paragraphs — other blocks are already rendered.
  if (blockNode.type.name !== 'paragraph') return false;
  if (paragraphHasProtectedMark(blockNode)) return false;

  const text = blockNode.textContent;
  if (!text) return false;
  if (!hasMarkdownSyntax(text)) return false;

  const blockSize = blockNode.nodeSize;
  const blockEnd = blockPos + blockSize;
  const schema = state.schema;

  // Try block-level first.
  const blockMatch = matchBlockPrefix(text);
  if (blockMatch) {
    const tr = state.tr;
    if (blockMatch.kind === 'heading' && schema.nodes.heading) {
      const newNode = schema.nodes.heading.create(
        { level: blockMatch.level },
        blockMatch.text ? schema.text(blockMatch.text) : null,
      );
      tr.replaceRangeWith(blockPos, blockEnd, newNode);
    } else if (blockMatch.kind === 'blockquote' && schema.nodes.blockquote && schema.nodes.paragraph) {
      const inner = schema.nodes.paragraph.create(null, blockMatch.text ? schema.text(blockMatch.text) : null);
      const wrap = schema.nodes.blockquote.create(null, inner);
      tr.replaceRangeWith(blockPos, blockEnd, wrap);
    } else if (blockMatch.kind === 'bulletList' && schema.nodes.bulletList && schema.nodes.listItem && schema.nodes.paragraph) {
      const para = schema.nodes.paragraph.create(null, blockMatch.text ? schema.text(blockMatch.text) : null);
      const item = schema.nodes.listItem.create(null, para);
      const list = schema.nodes.bulletList.create(null, item);
      tr.replaceRangeWith(blockPos, blockEnd, list);
    } else if (blockMatch.kind === 'orderedList' && schema.nodes.orderedList && schema.nodes.listItem && schema.nodes.paragraph) {
      const para = schema.nodes.paragraph.create(null, blockMatch.text ? schema.text(blockMatch.text) : null);
      const item = schema.nodes.listItem.create(null, para);
      const list = schema.nodes.orderedList.create(null, item);
      tr.replaceRangeWith(blockPos, blockEnd, list);
    } else if (blockMatch.kind === 'horizontalRule' && schema.nodes.horizontalRule) {
      const hr = schema.nodes.horizontalRule.create();
      tr.replaceRangeWith(blockPos, blockEnd, hr);
    } else {
      return false;
    }
    if (tr.docChanged) {
      editor.view.dispatch(tr.setMeta('reflow', true));
      return true;
    }
    return false;
  }

  // Inline pass — apply marks across the paragraph for **/*/`/link patterns.
  const inlineRanges = scanInlineMarkdown(text);
  if (inlineRanges.length === 0) return false;

  // Build the new paragraph content from scratch.
  const paraStart = blockPos + 1; // skip the opening paragraph token
  let cursor = 0;
  const newContent: PMNode[] = [];
  const inlineSchema = state.schema;
  const boldMark = inlineSchema.marks.bold;
  const italicMark = inlineSchema.marks.italic;
  const codeMark = inlineSchema.marks.code;
  const linkMark = inlineSchema.marks.link;

  for (const r of inlineRanges) {
    if (r.start < cursor) continue; // overlapping match, skip
    if (r.start > cursor) {
      const before = text.slice(cursor, r.start);
      if (before) newContent.push(inlineSchema.text(before));
    }
    let mark = null;
    if (r.mark === 'bold' && boldMark) mark = boldMark.create();
    else if (r.mark === 'italic' && italicMark) mark = italicMark.create();
    else if (r.mark === 'code' && codeMark) mark = codeMark.create();
    else if (r.mark === 'link' && linkMark && r.href) mark = linkMark.create({ href: r.href });
    if (mark) {
      newContent.push(inlineSchema.text(r.text, [mark]));
    } else {
      // Mark missing from schema — push raw text so we don't lose content.
      newContent.push(inlineSchema.text(r.text));
    }
    cursor = r.end;
  }
  if (cursor < text.length) {
    const tail = text.slice(cursor);
    if (tail) newContent.push(inlineSchema.text(tail));
  }
  if (newContent.length === 0) return false;

  const tr = state.tr.replaceWith(paraStart, paraStart + text.length, newContent);
  if (tr.docChanged) {
    editor.view.dispatch(tr.setMeta('reflow', true));
    return true;
  }
  return false;
}

/** Helper: given an editor selection, return the start position of the
 *  parent block (paragraph/heading/listItem/etc) the cursor is in. */
export function blockStartFromSelection(editor: Editor): number | null {
  const sel = editor.state.selection;
  if (!sel) return null;
  const $from = sel.$from;
  // Walk up to the nearest block-level ancestor (depth 1 in StarterKit is doc;
  // depth ≥ 2 is the block). We want the outermost block, so depth 1.
  if ($from.depth < 1) return null;
  return $from.before(1);
}
