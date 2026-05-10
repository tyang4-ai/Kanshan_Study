'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ZhihuBudgetKind = 'hot_list' | 'zhihu_search' | 'zhida';

export const DAILY_QUOTA: Record<ZhihuBudgetKind, number> = {
  hot_list: 100,
  zhihu_search: 1000,
  zhida: 100,
};

interface ZhihuBudgetState {
  consumed: Record<ZhihuBudgetKind, number>;
  lastReset: string; // YYYY-MM-DD in BJT
  consume: (kind: ZhihuBudgetKind, n?: number) => void;
  remaining: (kind: ZhihuBudgetKind) => number;
  resetIfNewDay: () => void;
  _reset: () => void; // test helper, do not call in app code
}

function todayBJT(): string {
  // BJT = UTC+8. Build YYYY-MM-DD in that timezone.
  const now = new Date();
  const bjt = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return bjt.toISOString().slice(0, 10);
}

export const useZhihuBudgetStore = create<ZhihuBudgetState>()(
  persist(
    (set, get) => ({
      consumed: { hot_list: 0, zhihu_search: 0, zhida: 0 },
      lastReset: todayBJT(),
      consume: (kind, n = 1) => {
        get().resetIfNewDay();
        set((s) => ({
          consumed: { ...s.consumed, [kind]: s.consumed[kind] + n },
        }));
      },
      remaining: (kind) => {
        const s = get();
        if (s.lastReset !== todayBJT()) return DAILY_QUOTA[kind];
        return Math.max(0, DAILY_QUOTA[kind] - s.consumed[kind]);
      },
      resetIfNewDay: () => {
        const today = todayBJT();
        if (get().lastReset !== today) {
          set({
            consumed: { hot_list: 0, zhihu_search: 0, zhida: 0 },
            lastReset: today,
          });
        }
      },
      _reset: () => set({
        consumed: { hot_list: 0, zhihu_search: 0, zhida: 0 },
        lastReset: todayBJT(),
      }),
    }),
    {
      name: 'kanshan-zhihu-budget',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          // No-op storage for SSR
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
        return localStorage;
      }),
    },
  ),
);
