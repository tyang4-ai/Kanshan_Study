'use client';
import { create } from 'zustand';
import type { Editor } from '@tiptap/react';

interface EditorState {
  editor: Editor | null;
  setEditor: (e: Editor | null) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  editor: null,
  setEditor: (e) => set({ editor: e }),
}));
