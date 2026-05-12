'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FoxId } from '@/lib/foxes/registry';

interface ActiveFoxesState {
  activeIds: FoxId[];
  toggle: (id: FoxId) => void;
  set: (ids: FoxId[]) => void;
}

// R3 fix (张荣乐 / 吴伟 P0 2026-05-12): default the daily 4 (shi/dian/mo/shui)
// instead of just 'mo'. Long-tail 答主 first-time experience now matches the
// DailyFoxPulse animation set + the new top-bar daily quartet.
const DEFAULT_ACTIVE: FoxId[] = ['mo', 'shi', 'dian', 'shui'];

export const useActiveFoxesStore = create<ActiveFoxesState>()(
  persist(
    (set) => ({
      activeIds: DEFAULT_ACTIVE,
      toggle: (id) =>
        set((state) => {
          if (state.activeIds.includes(id)) {
            if (state.activeIds.length === 1) return state;
            return { activeIds: state.activeIds.filter((x) => x !== id) };
          }
          return { activeIds: [...state.activeIds, id] };
        }),
      set: (ids) => set(() => ({ activeIds: ids.length === 0 ? DEFAULT_ACTIVE : ids })),
    }),
    {
      name: 'kanshan-active-foxes',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState, fromVersion) => {
        // v1 → v2: anyone sitting on the old single-fox default gets the new
        // daily 4. Custom selections are preserved.
        if (fromVersion < 2 && persistedState && typeof persistedState === 'object') {
          const s = persistedState as { activeIds?: FoxId[] };
          if (Array.isArray(s.activeIds) && s.activeIds.length === 1 && s.activeIds[0] === 'mo') {
            return { activeIds: DEFAULT_ACTIVE } as ActiveFoxesState;
          }
        }
        return persistedState as ActiveFoxesState;
      },
    }
  )
);
