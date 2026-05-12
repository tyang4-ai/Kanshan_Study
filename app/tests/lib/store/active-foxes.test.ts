import { describe, it, expect, beforeEach } from 'vitest';
import { useActiveFoxesStore } from '@/lib/store/active-foxes';

describe('useActiveFoxesStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useActiveFoxesStore.setState({ activeIds: ['mo'] });
  });

  it('default = [mo]', () => {
    expect(useActiveFoxesStore.getState().activeIds).toEqual(['mo']);
  });

  it('toggle adds non-active', () => {
    useActiveFoxesStore.getState().toggle('shan');
    expect(useActiveFoxesStore.getState().activeIds).toEqual(['mo', 'shan']);
  });

  it('toggle removes active when more than one', () => {
    useActiveFoxesStore.getState().toggle('shan');
    useActiveFoxesStore.getState().toggle('mo');
    expect(useActiveFoxesStore.getState().activeIds).toEqual(['shan']);
  });

  it('cannot deactivate last fox (at-least-one invariant)', () => {
    useActiveFoxesStore.getState().toggle('mo');
    expect(useActiveFoxesStore.getState().activeIds).toEqual(['mo']);
  });

  it('set([]) defaults back to daily 4', () => {
    // R3 fix (张荣乐 / 吴伟 P0 2026-05-12): default expanded from ['mo'] to
    // the daily 4 (shi/dian/mo/shui) to match the new top-bar quartet.
    useActiveFoxesStore.getState().set([]);
    expect(useActiveFoxesStore.getState().activeIds).toEqual(['mo', 'shi', 'dian', 'shui']);
  });

  it('set([wen, xin]) replaces', () => {
    useActiveFoxesStore.getState().set(['wen', 'xin']);
    expect(useActiveFoxesStore.getState().activeIds).toEqual(['wen', 'xin']);
  });

  it('persists across rehydrate', async () => {
    useActiveFoxesStore.getState().set(['shan', 'wen']);
    await useActiveFoxesStore.persist.rehydrate();
    expect(useActiveFoxesStore.getState().activeIds).toEqual(['shan', 'wen']);
  });
});
