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
// Default size = the resize clamp max so the window opens as wide as it's
// allowed to grow. Per-open computeDefaultSize tightens this to the actual
// viewport on first openTab so we don't spawn offscreen on narrower screens.
const DEFAULT_SIZE = { w: 1100, h: 600 };

function computeDefaultSize(): { w: number; h: number } {
  if (typeof window === 'undefined') return DEFAULT_SIZE;
  const margin = 280; // leave room for the LeftRail + RightToolbar pill
  const w = Math.max(340, Math.min(1100, window.innerWidth - margin));
  const h = Math.max(360, Math.min(window.innerHeight - 60, 600));
  return { w, h };
}

function computeDefaultPos(size: { w: number; h: number }): { x: number; y: number } {
  if (typeof window === 'undefined') return DEFAULT_POS;
  // Center horizontally; bias to left so the LeftRail isn't covered.
  const x = Math.max(160, Math.floor((window.innerWidth - size.w) / 2));
  return { x, y: 80 };
}

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
      // One tab per kind: if a tab of this kind is already open, focus it and
      // refresh its title + props (so the existing instance picks up the new
      // selection / context). Avoids the "long list of duplicate tabs" the
      // multi-instance variant was producing.
      const existing = state.tabs.find((t) => t.kind === kind);
      if (existing) {
        return {
          open: true,
          activeTabId: existing.id,
          tabs: state.tabs.map((t) =>
            t.id === existing.id ? { ...t, title, props } : t,
          ),
        };
      }
      const tab: Tab = { id: tabId(kind), kind, title, props };
      // First open in a session: re-fit the window to the current viewport so
      // it spawns as wide as the resize clamp allows. Existing tabs (already
      // open) keep whatever size the user dragged it to.
      const isFirstOpen = state.tabs.length === 0;
      const size = isFirstOpen ? computeDefaultSize() : state.size;
      const pos = isFirstOpen ? computeDefaultPos(size) : state.pos;
      return { open: true, tabs: [...state.tabs, tab], activeTabId: tab.id, size, pos };
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
  // Closing the window clears tabs — next openTab starts fresh with only the
  // newly-clicked panel (per user direction 2026-05-04: tabs are session-scoped to
  // the current "open" instance, not cached across close/reopen).
  closeWindow: () => set(() => ({ open: false, tabs: [], activeTabId: null })),
  movePos: (x, y) => set(() => ({ pos: { x, y } })),
  resize: (w, h) =>
    set(() => ({
      size: {
        w: Math.max(340, Math.min(1100, w)),
        h: Math.max(360, Math.min(window.innerHeight - 60, h)),
      },
    })),
}));
