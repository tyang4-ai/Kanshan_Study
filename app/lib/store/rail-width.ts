'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface RailWidthState {
  width: number;
  setWidth: (w: number) => void;
}

const MIN = 220;
const MAX = 560;
const DEFAULT = 320;

export const useRailWidthStore = create<RailWidthState>()(
  persist(
    (set) => ({
      width: DEFAULT,
      setWidth: (w) => set(() => ({ width: Math.max(MIN, Math.min(MAX, w)) })),
    }),
    { name: 'kanshan-rail-w', storage: createJSONStorage(() => localStorage) }
  )
);
