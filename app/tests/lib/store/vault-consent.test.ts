import { describe, it, expect, beforeEach } from 'vitest';
import { useVaultConsentStore } from '@/lib/store/vault-consent';

beforeEach(() => {
  window.localStorage.clear();
  useVaultConsentStore.setState({ consented: false, hydratedFor: null });
});

describe('vault-consent store', () => {
  describe('hydrate', () => {
    it('seeds consented=false for a fresh `me` account', () => {
      useVaultConsentStore.getState().hydrate('me');
      expect(useVaultConsentStore.getState().consented).toBe(false);
      expect(useVaultConsentStore.getState().hydratedFor).toBe('me');
    });

    it('auto-accepts the showcase `guwanxi` account', () => {
      useVaultConsentStore.getState().hydrate('guwanxi');
      expect(useVaultConsentStore.getState().consented).toBe(true);
      expect(useVaultConsentStore.getState().hydratedFor).toBe('guwanxi');
    });

    it('persists the auto-accept for guwanxi to localStorage', () => {
      useVaultConsentStore.getState().hydrate('guwanxi');
      expect(window.localStorage.getItem('kanshan-vault-consent:guwanxi')).toBe('1');
    });

    it('restores a previously persisted consented=true for `me`', () => {
      window.localStorage.setItem('kanshan-vault-consent:me', '1');
      useVaultConsentStore.getState().hydrate('me');
      expect(useVaultConsentStore.getState().consented).toBe(true);
    });

    it('restores a previously persisted consented=false for `me`', () => {
      window.localStorage.setItem('kanshan-vault-consent:me', '0');
      useVaultConsentStore.getState().hydrate('me');
      expect(useVaultConsentStore.getState().consented).toBe(false);
    });

    it('is idempotent for the same account', () => {
      useVaultConsentStore.getState().hydrate('me');
      useVaultConsentStore.getState().accept();
      useVaultConsentStore.getState().hydrate('me');
      expect(useVaultConsentStore.getState().consented).toBe(true);
    });
  });

  describe('accept', () => {
    it('flips consented to true and persists', () => {
      useVaultConsentStore.getState().hydrate('me');
      useVaultConsentStore.getState().accept();
      expect(useVaultConsentStore.getState().consented).toBe(true);
      expect(window.localStorage.getItem('kanshan-vault-consent:me')).toBe('1');
    });

    it('a reload of the store finds consented=true after accept', () => {
      useVaultConsentStore.getState().hydrate('me');
      useVaultConsentStore.getState().accept();
      // Simulate a reload: reset state and re-hydrate.
      useVaultConsentStore.setState({ consented: false, hydratedFor: null });
      useVaultConsentStore.getState().hydrate('me');
      expect(useVaultConsentStore.getState().consented).toBe(true);
    });
  });

  describe('revoke', () => {
    it('flips consented to false and persists', () => {
      useVaultConsentStore.getState().hydrate('me');
      useVaultConsentStore.getState().accept();
      useVaultConsentStore.getState().revoke();
      expect(useVaultConsentStore.getState().consented).toBe(false);
      expect(window.localStorage.getItem('kanshan-vault-consent:me')).toBe('0');
    });
  });

  describe('multi-account isolation', () => {
    it('me consent does not leak to guwanxi', () => {
      useVaultConsentStore.getState().hydrate('me');
      useVaultConsentStore.getState().accept();
      // Switch accounts — guwanxi auto-accepts independently.
      useVaultConsentStore.setState({ consented: false, hydratedFor: null });
      useVaultConsentStore.getState().hydrate('guwanxi');
      expect(useVaultConsentStore.getState().consented).toBe(true);
      // The persisted me flag is preserved.
      expect(window.localStorage.getItem('kanshan-vault-consent:me')).toBe('1');
    });

    it('guwanxi auto-accept does not leak to me', () => {
      useVaultConsentStore.getState().hydrate('guwanxi');
      useVaultConsentStore.setState({ consented: false, hydratedFor: null });
      useVaultConsentStore.getState().hydrate('me');
      expect(useVaultConsentStore.getState().consented).toBe(false);
    });
  });
});
