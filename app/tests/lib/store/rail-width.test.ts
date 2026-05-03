import { describe, it, expect, beforeEach } from 'vitest';
import { useRailWidthStore } from '@/lib/store/rail-width';

describe('useRailWidthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useRailWidthStore.setState({ width: 320 });
  });

  it('default = 320', () => {
    expect(useRailWidthStore.getState().width).toBe(320);
  });

  it('setWidth in range', () => {
    useRailWidthStore.getState().setWidth(400);
    expect(useRailWidthStore.getState().width).toBe(400);
  });

  it('clamps below MIN to 220', () => {
    useRailWidthStore.getState().setWidth(100);
    expect(useRailWidthStore.getState().width).toBe(220);
  });

  it('clamps above MAX to 560', () => {
    useRailWidthStore.getState().setWidth(1000);
    expect(useRailWidthStore.getState().width).toBe(560);
  });

  it('persists across rehydrate', async () => {
    useRailWidthStore.getState().setWidth(400);
    await useRailWidthStore.persist.rehydrate();
    expect(useRailWidthStore.getState().width).toBe(400);
  });
});
