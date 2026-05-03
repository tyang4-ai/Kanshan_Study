'use client';
import { create } from 'zustand';

export type TabKind =
  | 'vault' | 'settings' | 'stats' | 'trends'
  | 'persona' | 'debate' | 'voice-diff' | 'research';

export interface Tab {
  id: string;
  kind: TabKind;
  title: string;
  props: Record<string, unknown>;
}

interface FloatingWindowState {
  open: boolean;
  pos: { x: number; y: number };
  size: { w: number; h: number };
  tabs: Tab[];
  activeTabId: string | null;

  openTab: (kind: TabKind, title: string, props?: Record<string, unknown>) => void;
  closeTab: (id: string) => void;
  focusTab: (id: string) => void;
  closeWindow: () => void;
  movePos: (x: number, y: number) => void;
  resize: (w: number, h: number) => void;
}

const DEFAULT_POS = { x: 240, y: 80 };
const DEFAULT_SIZE = { w: 480, h: 600 };
const SINGLETON_KINDS: TabKind[] = ['vault', 'settings', 'stats', 'trends'];

const tabId = (kind: TabKind) =>
  `${kind}:${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const useFloatingWindowStore = create<FloatingWindowState>((set) => ({
  open: false,
  pos: DEFAULT_POS,
  size: DEFAULT_SIZE,
  tabs: [],
  activeTabId: null,

  openTab: (kind, title, props = {}) =>
    set((state) => {
      if (SINGLETON_KINDS.includes(kind)) {
        const existing = state.tabs.find((t) => t.kind === kind);
        if (existing) return { open: true, activeTabId: existing.id };
      }
      const tab: Tab = { id: tabId(kind), kind, title, props };
      return { open: true, tabs: [...state.tabs, tab], activeTabId: tab.id };
    }),

  closeTab: (id) =>
    set((state) => {
      const remaining = state.tabs.filter((t) => t.id !== id);
      if (remaining.length === 0) return { tabs: [], activeTabId: null, open: false };
      const wasActive = state.activeTabId === id;
      return {
        tabs: remaining,
        activeTabId: wasActive ? remaining[remaining.length - 1].id : state.activeTabId,
      };
    }),

  focusTab: (id) => set(() => ({ activeTabId: id, open: true })),
  closeWindow: () => set(() => ({ open: false })),
  movePos: (x, y) => set(() => ({ pos: { x, y } })),
  resize: (w, h) =>
    set(() => ({
      size: {
        w: Math.max(340, Math.min(1100, w)),
        h: Math.max(360, Math.min(window.innerHeight - 60, h)),
      },
    })),
}));
