'use client';
import { create } from 'zustand';
import type { Editor } from '@tiptap/react';

interface EditorState {
  editor: Editor | null;
  setEditor: (e: Editor | null) => void;
  /** r6 demo-day (2026-05-14): last non-empty selection text. Sticky — does
   *  NOT clear when ProseMirror selection collapses to a caret on blur.
   *  Lets entry-points that fire after the editor loses focus (e.g.
   *  TitleBar's daily-4 看墨 button click) still see what the user had
   *  selected. TipTapEditor onSelectionUpdate populates this. */
  lastSelectionText: string;
  setLastSelectionText: (text: string) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  editor: null,
  setEditor: (e) => set({ editor: e }),
  lastSelectionText: '',
  setLastSelectionText: (text) => set(() => ({ lastSelectionText: text })),
}));
