'use client';

import { useEffect, type CSSProperties } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { InlineMark } from './InlineMark';
import { MarginSeal } from './MarginSeal';
import { buildMatches } from './margin-seal-from-seeds';
import { FontSize } from './FontSize';
import { CitationMark } from '@/lib/citation/extension';
import { useEditorStore } from '@/lib/store/editor';
import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { buildCitationOnClick } from '@/lib/citation/click-router';
import type { Citation } from '@/lib/citation/types';
import type { MarginSealSeed } from './margin-seal-from-seeds';
import type { Editor } from '@tiptap/react';
import citationsJson from '@/content/seed/citations-demo.json';

const CITATIONS = citationsJson as Citation[];

export interface SelectionPayload {
  text: string;
  rect: DOMRect;
}

interface TipTapEditorProps {
  content: string;
  marginSeeds?: MarginSealSeed[];
  onSelectionChange?: (sel: SelectionPayload | null) => void;
  style?: CSSProperties;
}

const documentColumnStyle: CSSProperties = {
  position: 'relative',
  maxWidth: 720,
  margin: '0 auto',
  padding: '40px 56px 200px',
  fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif',
  color: '#1A1F2A',
  lineHeight: 1.78,
  fontSize: 16,
  outline: 'none',
};

function findCitation(id: string): Citation | null {
  return CITATIONS.find((c) => c.id === id) ?? null;
}

/** Extracted so it can be unit-tested without ProseMirror's view dispatch
 *  (JSDOM lacks `elementFromPoint` which PM's mousedown handler needs). */
export function handleCitationSupClick(
  target: EventTarget | null,
  openTab: ReturnType<typeof useFloatingWindowStore.getState>['openTab'],
): boolean {
  const el = target as HTMLElement | null;
  const sup = el?.closest?.('sup[data-citation-id]') as HTMLElement | null;
  if (!sup) return false;
  const id = sup.getAttribute('data-citation-id');
  if (!id) return false;
  const citation = findCitation(id);
  if (!citation) return false;
  const handler = buildCitationOnClick(citation, (props) =>
    openTab('vault', '看典 · 档案库', props),
  );
  handler();
  return true;
}

export function TipTapEditor({
  content,
  marginSeeds = [],
  onSelectionChange,
  style,
}: TipTapEditorProps) {
  const setEditor = useEditorStore((s) => s.setEditor);

  const editor = useEditor({
    extensions: [
      StarterKit,
      // Placeholder shows when editor doc has only an empty paragraph. Without
      // showOnlyCurrent:false + includeChildren:true, deleting all content
      // leaves a blank canvas with no copy — looks broken on the projector
      // (persona-review 2026-05-10 吴敏 P0).
      Placeholder.configure({
        placeholder: '此处落笔… (Ctrl+Shift+M 让看墨润色)',
        showOnlyCurrent: false,
        includeChildren: true,
      }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      InlineMark,
      MarginSeal.configure({
        matchesFor: (doc) => buildMatches(doc, marginSeeds),
      }),
      CitationMark,
    ],
    content,
    immediatelyRender: false,
    onUpdate({ editor: e }) {
      // Casual user persona-review R3 (Pan Xiaolin): edits didn't survive a
      // page reload — the editor remounted from the seed `content` prop.
      // Persist on every change to localStorage; the next mount reads it
      // back in the effect below. Per-account so 顾婉昔 ↔ me don't bleed.
      if (typeof window === 'undefined') return;
      try {
        // R4 code-quality (Hu Wei) P0: single regex exec per keystroke.
        const accountRaw = window.localStorage.getItem('kanshan-account');
        const m = accountRaw ? /"active":"(\w+)"/.exec(accountRaw) : null;
        const accountId = m?.[1] ?? 'me';
        window.localStorage.setItem(`kanshan-editor-doc:${accountId}`, e.getHTML());
      } catch {
        // private mode / quota — ignore; the editor in-memory state is fine
      }
    },
    editorProps: {
      handleClickOn(_view, _pos, _node, _nodePos, event) {
        const openTab = useFloatingWindowStore.getState().openTab;
        const handled = handleCitationSupClick(event.target, openTab);
        if (handled) event.preventDefault();
        return handled;
      },
    },
    onSelectionUpdate({ editor: e }) {
      if (!onSelectionChange) return;
      const { from, to, empty } = e.state.selection;
      if (empty) {
        onSelectionChange(null);
        return;
      }
      const text = e.state.doc.textBetween(from, to, ' ');
      if (!text) {
        onSelectionChange(null);
        return;
      }
      const start = e.view.coordsAtPos(from);
      const end = e.view.coordsAtPos(to);
      const rect = {
        left: Math.min(start.left, end.left),
        right: Math.max(start.right, end.right),
        top: Math.min(start.top, end.top),
        bottom: Math.max(start.bottom, end.bottom),
        width: Math.abs(end.right - start.left),
        height: Math.abs(end.bottom - start.top),
        x: Math.min(start.left, end.left),
        y: Math.min(start.top, end.top),
        toJSON: () => ({}),
      } as DOMRect;
      onSelectionChange({ text, rect });
    },
  });

  useEffect(() => {
    setEditor(editor as Editor | null);
    return () => setEditor(null);
  }, [editor, setEditor]);

  // Restore persisted doc on mount (per-account). Mirror of the onUpdate
  // writer above. Runs after the initial seed-content render so that an
  // empty localStorage falls back to the seed cleanly.
  useEffect(() => {
    if (!editor || typeof window === 'undefined') return;
    try {
      const accountRaw = window.localStorage.getItem('kanshan-account');
      const accountId =
        (accountRaw && /"active":"(\w+)"/.exec(accountRaw)?.[1]) || 'me';
      const persisted = window.localStorage.getItem(`kanshan-editor-doc:${accountId}`);
      if (persisted && persisted.trim().length > 0 && persisted !== editor.getHTML()) {
        editor.commands.setContent(persisted, { emitUpdate: false });
      }
    } catch {
      // ignore
    }
  }, [editor]);

  // Defense-in-depth: ProseMirror's `handleClickOn` runs only when the click
  // hits a node-with-content; clicks that land on a mark-only sup may slip
  // through, so we attach a DOM-level click listener on the editor root.
  useEffect(() => {
    const root = document.querySelector('[data-testid="tiptap-editor"]');
    if (!root) return;
    const onClick = (e: Event) => {
      const openTab = useFloatingWindowStore.getState().openTab;
      const handled = handleCitationSupClick(e.target, openTab);
      if (handled) e.preventDefault();
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, []);

  return (
    <div data-testid="tiptap-editor" data-tour-id="editor" style={style}>
      <div style={documentColumnStyle}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default TipTapEditor;
