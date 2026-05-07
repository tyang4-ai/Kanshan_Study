import { describe, it, expect, beforeEach } from 'vitest';
import { useTrendsGateStore } from '@/lib/store/trends-gate';

beforeEach(() => {
  useTrendsGateStore.setState({ pending: null });
});

describe('trends-gate store', () => {
  it('starts with no pending trend', () => {
    expect(useTrendsGateStore.getState().pending).toBeNull();
  });

  it('request() sets the pending trend', () => {
    useTrendsGateStore.getState().request({ title: 'AI 同质化' });
    expect(useTrendsGateStore.getState().pending).toEqual({ title: 'AI 同质化' });
  });

  it('clear() resets the pending trend to null', () => {
    useTrendsGateStore.getState().request({ title: 'X' });
    useTrendsGateStore.getState().clear();
    expect(useTrendsGateStore.getState().pending).toBeNull();
  });

  it('request() overwrites a previous pending trend', () => {
    useTrendsGateStore.getState().request({ title: 'first' });
    useTrendsGateStore.getState().request({ title: 'second' });
    expect(useTrendsGateStore.getState().pending).toEqual({ title: 'second' });
  });
});
