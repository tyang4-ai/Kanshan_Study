import { describe, it, expect, beforeEach } from 'vitest';
import { useDebateConfigStore } from '@/lib/store/debate-config';

beforeEach(() => {
  window.localStorage.clear();
  useDebateConfigStore.setState({
    proRoleId: 'expert',
    conRoleId: 'boundary',
    hydratedFor: null,
  });
});

describe('debate-config store', () => {
  describe('hydrate', () => {
    it('defaults to 业内行家 (expert) × 边界关注者 (boundary)', () => {
      useDebateConfigStore.getState().hydrate('me');
      const s = useDebateConfigStore.getState();
      expect(s.proRoleId).toBe('expert');
      expect(s.conRoleId).toBe('boundary');
      expect(s.hydratedFor).toBe('me');
    });

    it('restores from LS', () => {
      window.localStorage.setItem(
        'kanshan-debate-config:me',
        JSON.stringify({ proRoleId: 'passerby', conRoleId: 'whitecollar' }),
      );
      useDebateConfigStore.getState().hydrate('me');
      const s = useDebateConfigStore.getState();
      expect(s.proRoleId).toBe('passerby');
      expect(s.conRoleId).toBe('whitecollar');
    });

    it('is idempotent for the same account', () => {
      useDebateConfigStore.getState().hydrate('me');
      useDebateConfigStore.getState().setProRole('passerby');
      useDebateConfigStore.getState().hydrate('me');
      expect(useDebateConfigStore.getState().proRoleId).toBe('passerby');
    });
  });

  describe('setProRole / setConRole', () => {
    it('persists role changes', () => {
      useDebateConfigStore.getState().hydrate('me');
      useDebateConfigStore.getState().setProRole('whitecollar');
      useDebateConfigStore.getState().setConRole('passerby');
      const raw = window.localStorage.getItem('kanshan-debate-config:me');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw ?? '{}') as { proRoleId: string; conRoleId: string };
      expect(parsed.proRoleId).toBe('whitecollar');
      expect(parsed.conRoleId).toBe('passerby');
    });
  });

  describe('swap', () => {
    it('flips pro and con role ids', () => {
      useDebateConfigStore.getState().hydrate('me');
      const before = useDebateConfigStore.getState();
      useDebateConfigStore.getState().swap();
      const after = useDebateConfigStore.getState();
      expect(after.proRoleId).toBe(before.conRoleId);
      expect(after.conRoleId).toBe(before.proRoleId);
    });

    it('persists swap', () => {
      useDebateConfigStore.getState().hydrate('me');
      useDebateConfigStore.getState().swap();
      const parsed = JSON.parse(
        window.localStorage.getItem('kanshan-debate-config:me') ?? '{}',
      ) as { proRoleId: string; conRoleId: string };
      expect(parsed.proRoleId).toBe('boundary');
      expect(parsed.conRoleId).toBe('expert');
    });
  });

  describe('account isolation', () => {
    it('me and guwanxi keep separate role configs', () => {
      useDebateConfigStore.getState().hydrate('me');
      useDebateConfigStore.getState().setProRole('passerby');

      useDebateConfigStore.getState().hydrate('guwanxi');
      expect(useDebateConfigStore.getState().proRoleId).toBe('expert');

      useDebateConfigStore.getState().hydrate('me');
      expect(useDebateConfigStore.getState().proRoleId).toBe('passerby');
    });
  });
});
