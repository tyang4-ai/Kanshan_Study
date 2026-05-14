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
import { useProvenanceStore } from '@/lib/store/provenance';
import { detectClaims } from '@/lib/compliance/xin-detect';
import { XinFlag, setXinFlags, type XinFlagRange } from './XinFlag';
import { applyFixtureAnnotations, runLiveScan } from '@/lib/relmem/scanner';
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

/** r5 TASK A: extracted from onUpdate so editor.on('create') can also call
 *  it on cold doc load. Walks the doc, runs detectClaims per sentence, writes
 *  flagged ranges to the XinFlag decoration plugin + matching entries into
 *  useProvenanceStore. Pure visual; doesn't mutate the doc. */
function runXinScan(editor: Editor): void {
  const offenders: XinFlagRange[] = [];
  const entries: Array<Omit<import('@/lib/store/provenance').ProvenanceEntry, 'id' | 'at'>> = [];
  const sentenceTerminator = /[。！？!?]/;
  let sentenceStart: number | null = null;
  let sentenceText = '';
  const flushSentence = (endPos: number): void => {
    const trimmed = sentenceText.trim();
    // r6 FIX 5 v2 (emmett R6 P1 verifier): tightened bar to kill instruction-
    // fragment false-positives. Need ≥ 16 chars AND ≥ 8 CJK letters AND must
    // NOT start with an instruction-prefix verb ("做什么", "看什么", "选中",
    // "按下", "点击" etc — these are demo-flow steps, not author claims).
    const cjkCount = (trimmed.match(/\p{Script=Han}/gu) ?? []).length;
    const isInstructionLead = /^(做什么|看什么|选中|按下|按右|按顶|点击|点右|点顶|拖|双击|输入|期望|说明|提示|图标|鼠标|然后|接着|接下来|本演示|本工具|本文档|完成后|粘贴|复制|预期|此处|每条|每张|每只)/.test(trimmed);
    if (
      trimmed.length >= 16
      && cjkCount >= 8
      && !isInstructionLead
      && sentenceStart !== null
    ) {
      const flags = detectClaims(trimmed);
      if (!flags.safe) {
        const reasonParts: string[] = [];
        if (flags.medical) reasonParts.push('医学强声明');
        if (flags.financial) reasonParts.push('财务强声明');
        if (flags.cherryPick) reasonParts.push('个例外推');
        const reason = `看心 标记：${reasonParts.join(' / ')}`;
        offenders.push({ from: sentenceStart, to: endPos, reason });
        const excerpt = trimmed.slice(0, 80);
        if (flags.medical) entries.push({ kind: 'flagged', excerpt, fox: 'xin', relatedAction: 'live-scan' });
        if (flags.financial) entries.push({ kind: 'flagged', excerpt, fox: 'xin', relatedAction: 'live-scan' });
        if (flags.cherryPick) entries.push({ kind: 'hedge', excerpt, fox: 'xin', relatedAction: 'live-scan' });
      }
    }
    sentenceStart = null;
    sentenceText = '';
  };
  // r6 FIX 5 (emmett R6 P1): skip text inside heading + codeBlock nodes —
  // those caused false-positives like "Step 7 — 看墨" + quote-punctuation
  // tokens getting flagged. Track block-level skip via a parent-aware walk.
  // We use the parent argument of descendants: when the immediate parent is
  // a heading/codeBlock, don't append its text into the sentence buffer.
  editor.state.doc.descendants((node, pos, parent) => {
    const parentName = parent?.type?.name;
    if (parentName === 'heading' || parentName === 'codeBlock' || parentName === 'horizontalRule') {
      // Reset any in-progress sentence so we don't carry pre-heading text into
      // a post-heading sentence (xin would attribute the wrong range).
      sentenceStart = null;
      sentenceText = '';
      return true;
    }
    if (!node.isText || !node.text) return true;
    const text = node.text;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (sentenceStart === null) sentenceStart = pos + i;
      sentenceText += ch;
      if (sentenceTerminator.test(ch)) {
        flushSentence(pos + i + 1);
      }
    }
    return true;
  });
  flushSentence(editor.state.doc.content.size);
  useProvenanceStore.getState().replaceLiveScan(entries);
  setXinFlags(editor as unknown as { view: { state: { tr: unknown }; dispatch: (tr: unknown) => void } }, offenders);
  // r5 TASK I: same debounce-tick also refreshes relational-memory annotations.
  // Fixtures fire synchronously; live scan is best-effort + async.
  const docText = editor.state.doc.textContent ?? '';
  applyFixtureAnnotations(docText);
  void runLiveScan(docText);
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
  // 看心 live-scan debounce — runs detectClaims over the editor text after
  // typing settles (~800ms) so the bottom stamp counters tick in real time
  // without re-running the regex set on every keystroke.
  const xinScanTimerRef = useRef<number | null>(null);
  // r5 TASK A (周源/张荣乐/emmett/史中/吴伟P0): also run xin-scan once on
  // editor.on('create') so the GBM paste-block in the demo doc is flagged
  // BEFORE the user types anything. The old behavior only fired on onUpdate,
  // leaving the headline absolutist sentence undetected on a cold judge load.
  const ranInitialXinScanRef = useRef(false);
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
      // StarterKit v3 bundles a Link extension by default. We need our own
      // configured Link (openOnClick:false + autolink + kanshan-md-link class),
      // so disable StarterKit's bundled one to avoid the duplicate-extension
      // warning and the silent-no-op input rule that resulted (r4 周源 +
      // 张荣乐 + emmett + 史中 P0/P1).
      StarterKit.configure({ link: false }),
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
      XinFlag,
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

        // 看心 live-scan: debounced 800ms. Same scanner as the editor.on('create')
        // cold-load path (extracted to runXinScan); see helper above.
        if (xinScanTimerRef.current != null) {
          window.clearTimeout(xinScanTimerRef.current);
        }
        xinScanTimerRef.current = window.setTimeout(() => {
          runXinScan(e as Editor);
        }, 800);
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

  // Real autosave heartbeat. onUpdate already flushes on every keystroke, but
  // (a) bursts where the user pastes / runs an AI tweak in another tab don't
  // re-fire onUpdate, and (b) the indicator should advance even on idle so
  // the user has a visible "I am still being saved" signal. Every 5 minutes:
  // pull the editor's current HTML, push it through the store (no-op if
  // unchanged), and stamp lastSavedAt regardless so the indicator ticks.
  useEffect(() => {
    if (!editor) return;
    const intervalId = window.setInterval(() => {
      const tabId = useEditorTabsStore.getState().activeId;
      if (!tabId) return;
      try {
        setTabContent(tabId, editor.getHTML());
        useEditorTabsStore.getState().markSaved(tabId);
      } catch {
        // setContent already routes quota errors to the toast on the keystroke
        // path; silent on this heartbeat path so we don't double-notify.
      }
    }, 5 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [editor, setTabContent]);

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
  //
  // r5 TASK A (post-doc-sync xin scan): emitUpdate:false means the regular
  // onUpdate debounce never fires when the demo doc lands. Trigger runXinScan
  // explicitly after setContent so the GBM paste-block is flagged within a
  // tick of the doc being visible.
  useEffect(() => {
    if (!editor || !activeDoc || !activeId) return;
    if (lastSyncedIdRef.current === activeId) return;
    lastSyncedIdRef.current = activeId;
    const incoming = activeDoc.htmlContent ?? '<p></p>';
    if (incoming.trim() !== editor.getHTML().trim()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
    // Fire scan once on next tick so ProseMirror has the new doc state.
    window.setTimeout(() => {
      try { runXinScan(editor as Editor); } catch { /* defensive */ }
    }, 50);
    ranInitialXinScanRef.current = true;
  }, [editor, activeId, activeDoc]);

  // r5 TASK A: also run scan once on bare editor.on('create') for code paths
  // that mount the editor with `content` prop directly (tests, alternate shells).
  // No-op when the tab-sync path above already ran the scan.
  useEffect(() => {
    if (!editor) return;
    const onCreate = (): void => {
      if (ranInitialXinScanRef.current) return;
      try { runXinScan(editor as Editor); } catch { /* defensive */ }
      ranInitialXinScanRef.current = true;
    };
    editor.on('create', onCreate);
    return () => { editor.off('create', onCreate); };
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
