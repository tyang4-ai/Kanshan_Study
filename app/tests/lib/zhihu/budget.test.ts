import { describe, it, expect, beforeEach } from 'vitest';
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
