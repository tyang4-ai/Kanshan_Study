'use client';
import { VoiceDiffPanel } from '@/components/voice/VoiceDiffPanel';
import { useEditorStore } from '@/lib/store/editor';

// ContextMenu passes selection as { text, rect } from the editor; other callers (e.g. tests)
// may pass a plain string. Normalize at the boundary.
type SelectionInput = string | { text: string; rect?: DOMRect } | null | undefined;

interface VoiceDiffTabProps {
  selection?: SelectionInput;
  bullets?: string;
  mode?: 'fill' | 'polish';
}

function toText(s: SelectionInput): string {
  if (!s) return '';
  if (typeof s === 'string') return s;
  return s.text;
}

export function VoiceDiffTab({ selection, bullets, mode }: VoiceDiffTabProps = {}) {
  const propText = toText(selection);
  // r6 demo-day (2026-05-14): triple-fallback so any entry-point sees a
  // non-empty selection text:
  //   1. selection prop (passed by RightToolbar's selection-required path)
  //   2. editor.state.selection (current PM selection — works if editor
  //      hasn't been blurred yet)
  //   3. useEditorStore.lastSelectionText (sticky — set on every non-empty
  //      onSelectionUpdate, NEVER cleared on blur/caret-collapse)
  const editor = useEditorStore((s) => s.editor);
  const lastSelectionText = useEditorStore((s) => s.lastSelectionText);
  const fallbackText = (() => {
    if (propText) return propText;
    if (editor) {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const live = editor.state.doc.textBetween(from, to, ' ').trim();
        if (live) return live;
      }
    }
    return lastSelectionText;
  })();
  return (
    <VoiceDiffPanel
      selection={fallbackText}
      bullets={bullets ?? fallbackText ?? '— 这一段需要例子'}
      mode={mode ?? 'polish'}
    />
  );
}
