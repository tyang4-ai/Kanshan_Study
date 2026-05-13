'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import Link from '@tiptap/extension-link';
import { InlineMark } from './InlineMark';
import { MarginSeal } from './MarginSeal';
import { buildMatches } from './margin-seal-from-seeds';
import { FontSize } from './FontSize';
import { CitationMark } from '@/lib/citation/extension';
import { Markdown } from 'tiptap-markdown';
import { useEditorStore } from '@/lib/store/editor';
import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { useEditorTabsStore } from '@/lib/store/editor-tabs';
import { useAccountStore } from '@/lib/store/account';
import { useLastVisitStore } from '@/lib/store/last-visit';
import { reflowBlockAt, blockStartFromSelection } from './markdown-reflow';
import { LivePreview } from './LivePreview';
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
  /** Optional initial seed content. When omitted, the editor mounts empty
   *  and the editor-tabs store fills it via the active-doc sync effect on
   *  the next tick. Kept for tests that mount a bare editor without a tab
   *  store hydrate cycle. */
  content?: string;
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
  // R2 judge fix (史中 P0 2026-05-12): editor dead-zone — clicks below the
  // last paragraph or in the empty bottom padding didn't reach ProseMirror.
  // Stretching the column so the typeable surface fills the scroll region
  // means the wrapper-level onClick (in WritingSurface region) actually has
  // ProseMirror underneath for click-to-focus to take effect.
  minHeight: 'calc(100vh - 200px)',
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
  content = '<p></p>',
  marginSeeds = [],
  onSelectionChange,
  style,
}: TipTapEditorProps) {
  const setEditor = useEditorStore((s) => s.setEditor);
  const account = useAccountStore((s) => s.active);
  const hydrate = useEditorTabsStore((s) => s.hydrate);
  const activeId = useEditorTabsStore((s) => s.activeId);
  const activeDoc = useEditorTabsStore((s) => (s.activeId ? s.docs[s.activeId] ?? null : null));
  const setTabContent = useEditorTabsStore((s) => s.setContent);
  const setTabDirty = useEditorTabsStore((s) => s.setDirty);
  // R4 edge-case (Ren Bo) P2: one-shot guard so the persistence-failed
  // toast doesn't fire on every keystroke after quota is hit.
  const persistFailedRef = useRef(false);
  // Tracks the last activeId we synced into the editor, so a true tab
  // switch swaps content but a content-change-of-same-tab doesn't.
  const lastSyncedIdRef = useRef<string | null>(null);
  // R2 judge fix (李笛 P0 2026-05-12): debounce timer for last-visit recording.
  // Coalesces a burst of keystrokes into a single localStorage write every
  // ~3s; avoids hammering the persist middleware on every onUpdate.
  const lastVisitTimerRef = useRef<number | null>(null);
  // Obsidian-style live markdown: track the block-position the caret was in
  // on the previous tick. When it changes (caret moved to a different block),
  // reflow the previous block — that's the "click away → render" trigger.
  const lastBlockPosRef = useRef<number | null>(null);

  // Hydrate the tab store for the current account on mount + on account swap.
  useEffect(() => {
    hydrate(account);
  }, [account, hydrate]);

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
      // Obsidian-style markdown: typing `[text](url)` produces an <a> via input
      // rule; pasted bare URLs auto-link. openOnClick: false keeps the cursor
      // free to edit; links open via Ctrl+click or the export path.
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'kanshan-md-link',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      InlineMark,
      MarginSeal.configure({
        matchesFor: (doc) => buildMatches(doc, marginSeeds),
      }),
      CitationMark,
      Markdown.configure({
        html: true,
        breaks: false,
        // Obsidian-style: pasting raw markdown converts to nodes; copying from
        // the editor produces markdown text for paste-into-公众号/小红书/etc.
        transformPastedText: true,
        transformCopiedText: true,
      }),
      // Live Preview: show markdown source as dim widgets when caret is in
      // the block. Must come AFTER all node/mark extensions so it sees the
      // final schema.
      LivePreview,
    ],
    content,
    immediatelyRender: false,
    onUpdate({ editor: e }) {
      // Push the new HTML into the active tab in the editor-tabs store.
      // The store handles per-account localStorage persistence + lastSavedAt
      // stamping, so the AutosaveIndicator can show a real timestamp.
      // R4 edge-case (Ren Bo) P2: persistence-failed toast fires at most once.
      const id = useEditorTabsStore.getState().activeId;
      if (!id) return;
      // R2 judge fix (李笛 P0 2026-05-12): coalesced last-visit snapshot.
      // Records filename + first 40 chars of textContent so the next session
      // can show ReturningVisitorBubble. Debounced 3s so a typing burst
      // becomes one write.
      if (typeof window !== 'undefined') {
        if (lastVisitTimerRef.current != null) {
          window.clearTimeout(lastVisitTimerRef.current);
        }
        lastVisitTimerRef.current = window.setTimeout(() => {
          const doc = useEditorTabsStore.getState().docs[id];
          if (!doc) return;
          const text = e.state.doc.textContent ?? '';
          if (!text.trim()) return;
          useLastVisitStore.getState().recordVisit({
            filename: doc.filename,
            topicSnippet: text.trim(),
          });
        }, 3000);
      }
      try {
        setTabContent(id, e.getHTML());
        setTabDirty(id, false);
      } catch (err) {
        if (!persistFailedRef.current && err instanceof Error) {
          persistFailedRef.current = true;
          const msg = /quota|private/i.test(err.message)
            ? '本地存储已满，本次编辑不再自动保存。请清出空间或导出文稿。'
            : '本地存储写入失败，本次编辑不再自动保存。';
          void import('@/lib/store/ai-error').then((m) => {
            m.useAiErrorStore.getState().push({ message: msg });
          }).catch(() => { /* surfacing is best-effort */ });
        }
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
      // Obsidian-style click-away reflow: when the active block changes
      // (caret moved to a different paragraph/heading/list/etc), reflow the
      // PREVIOUS block. Captures the "I typed `# foo` but never hit space"
      // case + paste-mid-line cases.
      const currentBlockPos = blockStartFromSelection(e as Editor);
      const prev = lastBlockPosRef.current;
      if (prev != null && prev !== currentBlockPos) {
        try { reflowBlockAt(e as Editor, prev); } catch { /* defensive */ }
      }
      lastBlockPosRef.current = currentBlockPos;

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

  // Obsidian-style: when the editor loses focus, reflow whatever block the
  // caret was last in. Catches clicks into the rail / toolbar / floating tab.
  useEffect(() => {
    if (!editor) return;
    const onBlur = (): void => {
      const pos = lastBlockPosRef.current;
      if (pos == null) return;
      try { reflowBlockAt(editor as Editor, pos); } catch { /* defensive */ }
    };
    editor.on('blur', onBlur);
    return () => { editor.off('blur', onBlur); };
  }, [editor]);

  // Sync editor content with the active tab.
  //
  // Fires on (a) initial mount once the active doc lands, and (b) every
  // subsequent tab switch. Within a single tab, onUpdate is the writer and
  // this effect is a no-op (lastSyncedIdRef gates re-application).
  useEffect(() => {
    if (!editor || !activeDoc || !activeId) return;
    if (lastSyncedIdRef.current === activeId) return;
    lastSyncedIdRef.current = activeId;
    const incoming = activeDoc.htmlContent ?? '<p></p>';
    if (incoming.trim() !== editor.getHTML().trim()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [editor, activeId, activeDoc]);

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

  // R2 judge fix (史中 P0 2026-05-12): click-to-focus on the wrapper. If the
  // click lands on chrome (not inside ProseMirror), focus editor end. Clicks
  // inside .ProseMirror already pass through to TipTap's native handling.
  const onWrapperClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!editor) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('.ProseMirror')) return;
    editor.commands.focus('end');
  };

  return (
    <div data-testid="tiptap-editor" data-tour-id="editor" style={style} onClick={onWrapperClick}>
      <div style={documentColumnStyle}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default TipTapEditor;
