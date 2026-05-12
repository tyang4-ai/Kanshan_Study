'use client';
import { create } from 'zustand';

interface VaultConsentState {
  consented: boolean;
  hydratedFor: string | null;

  /** Load consent flag for this account from localStorage. The showcase
   *  account `guwanxi` is auto-accepted (no real consent needed). */
  hydrate: (accountId: string) => void;

  /** Flip to consented = true and persist. */
  accept: () => void;

  /** Flip to consented = false and persist. */
  revoke: () => void;
}

const KEY = (acc: string): string => `kanshan-vault-consent:${acc}`;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function loadFromStorage(accountId: string): boolean | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(KEY(accountId));
    if (raw === null) return null;
    return raw === '1' || raw === 'true';
  } catch {
    return null;
  }
}

function saveToStorage(accountId: string, consented: boolean): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY(accountId), consented ? '1' : '0');
  } catch {
    // quota — ignored
  }
}

export const useVaultConsentStore = create<VaultConsentState>((set, get) => ({
  consented: false,
  hydratedFor: null,

  hydrate(accountId) {
    if (get().hydratedFor === accountId) return;
    const stored = loadFromStorage(accountId);
    if (accountId === 'guwanxi') {
      // Showcase account auto-accepts; persist so server-side header path stays
      // consistent across reloads.
      saveToStorage(accountId, true);
      set({ consented: true, hydratedFor: accountId });
      return;
    }
    set({ consented: stored ?? false, hydratedFor: accountId });
  },

  accept() {
    set((state) => {
      if (state.hydratedFor) saveToStorage(state.hydratedFor, true);
      return { consented: true };
    });
  },

  revoke() {
    set((state) => {
      if (state.hydratedFor) saveToStorage(state.hydratedFor, false);
      return { consented: false };
    });
  },
}));
