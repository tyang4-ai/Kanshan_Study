'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type PinKind = 'vault' | 'research' | 'trends' | 'note';
export type PinSource = 'user' | 'kanshan';

export interface CorkboardPin {
  id: string;
  kind: PinKind;
  sourceId?: string;
  // x/y are optional — when unset, the layout helper assigns a grid slot at
  // render time. User drags overwrite with explicit coords.
  x?: number;
  y?: number;
  w: number;
  h: number;
  content: {
    title?: string;
    snippet?: string;
    annotation?: string;
    url?: string;
  };
  createdBy: PinSource;
  createdAt: number;
}

interface CorkboardState {
  pins: CorkboardPin[];
  addPin: (pin: Omit<CorkboardPin, 'id' | 'createdAt'>) => string;
  addPostit: (annotation: string, createdBy?: PinSource) => string;
  removePin: (id: string) => void;
  movePin: (id: string, x: number, y: number, bounds?: { w: number; h: number }) => void;
  updateAnnotation: (id: string, annotation: string) => void;
  /** Bump a pin to the top of the visual stack within its own kind-group.
   * Render order = array order, so we move the pin to the end of the pins
   * array. Post-its still render above non-notes via the sort in Corkboard.tsx,
   * but within post-its (or within cards), this gives last-clicked-is-on-top. */
  bringToFront: (id: string) => void;
  clear: () => void;
  /** Persona-fix #4 (2026-05-09 周敏 review): clear only 看山-pinned cards,
   * leaving user-pinned cards intact. Lets a user reset the orchestrator's
   * suggestions without losing their own working memory. */
  clearKanshan: () => void;
}

const newId = (kind: PinKind) =>
  `pin-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const DEFAULT_NOTE_W = 160;
const DEFAULT_NOTE_H = 80;
const DEFAULT_CARD_W = 180;
const DEFAULT_CARD_H = 120;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export const useCorkboardStore = create<CorkboardState>()(
  persist(
    (set) => ({
      pins: [],

      addPin: (pin) => {
        const id = newId(pin.kind);
        set((s) => ({
          pins: [
            ...s.pins,
            {
              ...pin,
              id,
              w: pin.w ?? (pin.kind === 'note' ? DEFAULT_NOTE_W : DEFAULT_CARD_W),
              h: pin.h ?? (pin.kind === 'note' ? DEFAULT_NOTE_H : DEFAULT_CARD_H),
              createdAt: Date.now(),
            },
          ],
        }));
        return id;
      },

      addPostit: (annotation, createdBy = 'user') => {
        const id = newId('note');
        set((s) => ({
          pins: [
            ...s.pins,
            {
              id,
              kind: 'note',
              w: DEFAULT_NOTE_W,
              h: DEFAULT_NOTE_H,
              content: { annotation },
              createdBy,
              createdAt: Date.now(),
            },
          ],
        }));
        return id;
      },

      removePin: (id) =>
        set((s) => ({ pins: s.pins.filter((p) => p.id !== id) })),

      movePin: (id, x, y, bounds) =>
        set((s) => ({
          pins: s.pins.map((p) => {
            if (p.id !== id) return p;
            const cx = bounds ? clamp(x, 0, Math.max(0, bounds.w - p.w)) : x;
            const cy = bounds ? clamp(y, 0, Math.max(0, bounds.h - p.h)) : y;
            return { ...p, x: cx, y: cy };
          }),
        })),

      updateAnnotation: (id, annotation) =>
        set((s) => ({
          pins: s.pins.map((p) =>
            p.id === id ? { ...p, content: { ...p.content, annotation } } : p,
          ),
        })),

      bringToFront: (id) =>
        set((s) => {
          const target = s.pins.find((p) => p.id === id);
          if (!target) return s;
          const rest = s.pins.filter((p) => p.id !== id);
          return { pins: [...rest, target] };
        }),

      clear: () => set(() => ({ pins: [] })),

      clearKanshan: () =>
        set((s) => ({ pins: s.pins.filter((p) => p.createdBy !== 'kanshan') })),
    }),
    {
      name: 'kanshan-corkboard',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // v1 → v2 (2026-05-13): purge any sticky note whose annotation/snippet
      // matches the radiogenomics-era pattern. Pre-pivot demos left these
      // stuck in localStorage and the Corkboard.tsx cleanup pass was racing
      // with the persisted state. Bumping the version forces this migration
      // on every previously-persisted browser exactly once.
      migrate: (persistedState, fromVersion) => {
        if (!persistedState || typeof persistedState !== 'object') return persistedState;
        if (fromVersion >= 2) return persistedState as { pins?: CorkboardPin[] };
        const s = persistedState as { pins?: CorkboardPin[] };
        if (!Array.isArray(s.pins)) return s;
        const STALE_RE = /影像组学|radiomics|影像 AI/i;
        const pinText = (p: CorkboardPin): string =>
          (p.content?.annotation ?? p.content?.snippet ?? p.content?.title ?? '') as string;
        const filtered = s.pins.filter((p) => !STALE_RE.test(pinText(p)));
        return { ...s, pins: filtered };
      },
    },
  ),
);
