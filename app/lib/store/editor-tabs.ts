'use client';
import { create } from 'zustand';

export interface EditorTabEntry {
  filename: string;
  active: boolean;
  dirty: boolean;
}

interface EditorTabsState {
  tabs: EditorTabEntry[];
  setActiveFilename: (filename: string) => void;
  markActiveDirty: (dirty: boolean) => void;
}

const SEED: EditorTabEntry[] = [
  { filename: '影像组学与基因组学.md', active: true, dirty: true },
  { filename: 'research-notes.md', active: false, dirty: false },
  { filename: 'readme.md', active: false, dirty: false },
];

export const useEditorTabsStore = create<EditorTabsState>((set) => ({
  tabs: SEED,
  setActiveFilename: (filename) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.active ? { ...t, filename } : t)),
    })),
  markActiveDirty: (dirty) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.active ? { ...t, dirty } : t)),
    })),
}));
