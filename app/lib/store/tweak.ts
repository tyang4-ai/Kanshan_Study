'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Phase #16.6 — dev-time tweaker store. Lives in localStorage so reloading
// the page keeps your slider positions. The panel only mounts when the URL
// has `?tweak=1`; consumers read the values unconditionally and fall back to
// component defaults if the slider hasn't been touched.

export interface TweakState {
  values: Record<string, number>;
  setTweak: (id: string, value: number) => void;
  reset: (id: string) => void;
  resetAll: () => void;
}

export const useTweakStore = create<TweakState>()(
  persist(
    (set) => ({
      values: {},
      setTweak: (id, value) =>
        set((s) => ({ values: { ...s.values, [id]: value } })),
      reset: (id) =>
        set((s) => {
          const next = { ...s.values };
          delete next[id];
          return { values: next };
        }),
      resetAll: () => set({ values: {} }),
    }),
    { name: 'kanshan-tweak' },
  ),
);

// Convenience hook: subscribes to one tweak with a default fallback.
export function useTweak(id: string, fallback: number): number {
  return useTweakStore((s) => s.values[id] ?? fallback);
}
