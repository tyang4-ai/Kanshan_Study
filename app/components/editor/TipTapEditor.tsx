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
      Placeholder.configure({ placeholder: '此处落笔…' }),
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
    editorProps: {
      handleClickOn(view, _pos, _node, _nodePos, event) {
        const target = event.target as HTMLElement | null;
        const sup = target?.closest?.('sup[data-citation-id]') as HTMLElement | null;
        if (!sup) return false;
        const id = sup.getAttribute('data-citation-id');
        if (!id) return false;
        const citation = findCitation(id);
        if (!citation) return false;
        const openTab = useFloatingWindowStore.getState().openTab;
        const handler = buildCitationOnClick(citation, (props) =>
          openTab('vault', '看典 · 档案库', props),
        );
        handler();
        event.preventDefault();
        return true;
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

  return (
    <div data-testid="tiptap-editor" style={style}>
      <div style={documentColumnStyle}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default TipTapEditor;
