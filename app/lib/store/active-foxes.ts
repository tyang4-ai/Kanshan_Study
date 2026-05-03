'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FoxId } from '@/lib/foxes/registry';

interface ActiveFoxesState {
  activeIds: FoxId[];
  toggle: (id: FoxId) => void;
  set: (ids: FoxId[]) => void;
}

export const useActiveFoxesStore = create<ActiveFoxesState>()(
  persist(
    (set) => ({
      activeIds: ['mo'],
      toggle: (id) =>
        set((state) => {
          if (state.activeIds.includes(id)) {
            if (state.activeIds.length === 1) return state;
            return { activeIds: state.activeIds.filter((x) => x !== id) };
          }
          return { activeIds: [...state.activeIds, id] };
        }),
      set: (ids) => set(() => ({ activeIds: ids.length === 0 ? ['mo'] : ids })),
    }),
    {
      name: 'kanshan-active-foxes',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
