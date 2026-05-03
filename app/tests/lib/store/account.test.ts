import { describe, it, expect, beforeEach } from 'vitest';
import { useAccountStore } from '@/lib/store/account';

describe('useAccountStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAccountStore.setState({ active: 'me' });
  });

  it('default = me', () => {
    expect(useAccountStore.getState().active).toBe('me');
  });

  it('switchTo flips active', () => {
    useAccountStore.getState().switchTo('guwanxi');
    expect(useAccountStore.getState().active).toBe('guwanxi');
  });

  it('persists across rehydrate', async () => {
    useAccountStore.getState().switchTo('guwanxi');
    await useAccountStore.persist.rehydrate();
    expect(useAccountStore.getState().active).toBe('guwanxi');
  });
});
