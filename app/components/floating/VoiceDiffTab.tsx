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
    // Selection collapsed (focus left the editor when 看墨 opened) — search
    // each text node for fallbackText. The absolutist sentence is a single
    // paragraph child, so it lives inside one text node and indexOf works.
    editor.state.doc.descendants((node, pos) => {
      if (rangeRef.current) return false;
      if (node.isText && node.text) {
        const localIdx = node.text.indexOf(fallbackText);
        if (localIdx >= 0) {
          rangeRef.current = {
            from: pos + localIdx,
            to: pos + localIdx + fallbackText.length,
          };
          return false;
        }
      }
      return true;
    });
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
