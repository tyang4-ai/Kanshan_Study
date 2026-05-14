'use client';
import { useMemo, useRef } from 'react';
import { VoiceDiffPanel } from '@/components/voice/VoiceDiffPanel';
import { useEditorStore } from '@/lib/store/editor';

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

  // Capture the PM range that matches fallbackText at mount, so 采用 can
  // replace the exact original selection even after focus moved to the
  // 看墨 panel and the live PM selection collapsed.
  const rangeRef = useRef<{ from: number; to: number } | null>(null);
  useMemo(() => {
    if (!editor || !fallbackText) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      rangeRef.current = { from, to };
      return;
    }
    // Selection already collapsed — find first occurrence of fallbackText in
    // the doc and use that range.
    const docText = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', '￼');
    const idx = docText.indexOf(fallbackText);
    if (idx < 0) return;
    // Walk the doc to map string offset → PM position. textBetween uses
    // '\n' as block separator (1 char each); PM positions count one per
    // node boundary too, so we walk descendants and track both cursors.
    let pmPos = 0;
    let strPos = 0;
    let rangeStart: number | null = null;
    let rangeEnd: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (rangeEnd !== null) return false;
      if (node.isText) {
        const len = node.text?.length ?? 0;
        const localStart = idx - strPos;
        if (rangeStart === null && localStart >= 0 && localStart < len) {
          rangeStart = pos + localStart;
        }
        const localEnd = idx + fallbackText.length - strPos;
        if (rangeStart !== null && rangeEnd === null && localEnd <= len) {
          rangeEnd = pos + localEnd;
        }
        strPos += len;
        pmPos = pos + len;
        return false;
      }
      if (node.isBlock && pmPos > 0) strPos += 1; // '\n' separator
      pmPos = pos;
      return true;
    });
    if (rangeStart !== null && rangeEnd !== null) {
      rangeRef.current = { from: rangeStart, to: rangeEnd };
    }
  }, [editor, fallbackText]);

  const handleAccept = (text: string) => {
    if (!editor || !text) return;
    const range = rangeRef.current;
    if (range) {
      editor.chain().focus().setTextSelection(range).insertContent(text).run();
      // Update the captured range so a second 采用 click (re-pick generic
      // after voice or vice versa) targets the just-inserted block.
      const newTo = range.from + text.length;
      rangeRef.current = { from: range.from, to: newTo };
    } else {
      editor.chain().focus().insertContent(text).run();
    }
  };

  return (
    <VoiceDiffPanel
      selection={fallbackText}
      bullets={bullets ?? fallbackText ?? '— 这一段需要例子'}
      mode={mode ?? 'polish'}
      onAccept={handleAccept}
    />
  );
}
