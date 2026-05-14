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
  // r6 demo-day (2026-05-14): when the panel is opened from TitleBar's
  // daily-4 看墨 button (no selection passed), or any other entry-point
  // that doesn't thread the selection, read the editor's CURRENT selection
  // directly so the panel + its canonical-fallback detection both see the
  // text the user actually has selected.
  const editor = useEditorStore((s) => s.editor);
  const fallbackText = (() => {
    if (propText) return propText;
    if (!editor) return '';
    const { from, to } = editor.state.selection;
    if (from === to) return '';
    return editor.state.doc.textBetween(from, to, ' ').trim();
  })();
  return (
    <VoiceDiffPanel
      selection={fallbackText}
      bullets={bullets ?? fallbackText ?? '— 这一段需要例子'}
      mode={mode ?? 'polish'}
    />
  );
}
