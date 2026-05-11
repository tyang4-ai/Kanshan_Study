import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useZhihuBudgetStore, DAILY_QUOTA } from '@/lib/zhihu/budget';

describe('useZhihuBudgetStore', () => {
  beforeEach(() => {
    useZhihuBudgetStore.getState()._reset();
  });

  it('starts with zero consumed and full remaining', () => {
    const s = useZhihuBudgetStore.getState();
    expect(s.remaining('hot_list')).toBe(DAILY_QUOTA.hot_list);
    expect(s.remaining('zhihu_search')).toBe(DAILY_QUOTA.zhihu_search);
    expect(s.remaining('zhida')).toBe(DAILY_QUOTA.zhida);
  });

  it('consume decrements remaining', () => {
    const s = useZhihuBudgetStore.getState();
    s.consume('hot_list', 3);
    expect(useZhihuBudgetStore.getState().remaining('hot_list'))
      .toBe(DAILY_QUOTA.hot_list - 3);
  });

  it('remaining never goes negative even after over-consume', () => {
    const s = useZhihuBudgetStore.getState();
    s.consume('zhida', DAILY_QUOTA.zhida + 50);
    expect(useZhihuBudgetStore.getState().remaining('zhida')).toBe(0);
  });

  it('resetIfNewDay clears counters when lastReset is stale', () => {
    const store = useZhihuBudgetStore;
    store.getState().consume('hot_list', 5);
    expect(store.getState().remaining('hot_list')).toBe(DAILY_QUOTA.hot_list - 5);
    // Simulate yesterday
    store.setState({ lastReset: '2020-01-01' });
    store.getState().resetIfNewDay();
    expect(store.getState().remaining('hot_list')).toBe(DAILY_QUOTA.hot_list);
  });

  it('consume default n=1', () => {
    const s = useZhihuBudgetStore.getState();
    s.consume('zhihu_search');
    expect(useZhihuBudgetStore.getState().remaining('zhihu_search'))
      .toBe(DAILY_QUOTA.zhihu_search - 1);
  });
});

describe('todayBJT day boundary (UTC+8)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('immediately before BJT midnight (UTC 15:59:59) returns the same date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T15:59:59Z'));
    const store = useZhihuBudgetStore;
    store.setState({ lastReset: '2026-05-10' });
    store.getState().consume('hot_list', 7);
    store.getState().resetIfNewDay();
    // BJT 23:59:59 on 2026-05-10 — same day, should NOT reset
    expect(store.getState().remaining('hot_list')).toBe(DAILY_QUOTA.hot_list - 7);
  });

  it('immediately after BJT midnight (UTC 16:00:01) triggers reset', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T16:00:01Z'));
    const store = useZhihuBudgetStore;
    store.setState({
      lastReset: '2026-05-10',
      consumed: { hot_list: 7, zhihu_search: 0, zhida: 0 },
    });
    store.getState().resetIfNewDay();
    // BJT 00:00:01 on 2026-05-11 — NEW day, should reset
    expect(store.getState().remaining('hot_list')).toBe(DAILY_QUOTA.hot_list);
    expect(store.getState().lastReset).toBe('2026-05-11');
  });
});
