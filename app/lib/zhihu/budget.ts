'use client';
import { create } from 'zustand';

export type ZhihuBudgetKind = 'hot_list' | 'zhihu_search' | 'zhida';

interface ZhihuBudgetState {
  remaining: (kind: ZhihuBudgetKind) => number;
}

const DAILY_QUOTA: Record<ZhihuBudgetKind, number> = {
  hot_list: 100,
  zhihu_search: 1000,
  zhida: 100,
};

// TODO plan #14: replace with real per-day quota tracking (decrements on each call,
// resets at midnight BJT, persists to localStorage). For now returns the daily quota.
export const useZhihuBudgetStore = create<ZhihuBudgetState>(() => ({
  remaining: (kind) => DAILY_QUOTA[kind],
}));
