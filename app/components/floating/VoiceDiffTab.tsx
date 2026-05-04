'use client';
import { VoiceDiffPanel } from '@/components/voice/VoiceDiffPanel';

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
  const selectionText = toText(selection);
  return (
    <VoiceDiffPanel
      selection={selectionText}
      bullets={bullets ?? selectionText ?? '— 这一段需要例子'}
      mode={mode ?? 'polish'}
    />
  );
}
