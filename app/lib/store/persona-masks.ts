'use client';
import { create } from 'zustand';
import type { CustomMask } from '@/lib/personas';

export type PersonaMask = CustomMask;

interface PersonaMasksState {
  customMasks: PersonaMask[];
  hydratedFor: string | null;

  hydrate: (accountId: string) => void;
  addCustom: (mask: PersonaMask) => void;
  removeCustom: (id: string) => void;
}

const KEY = (acc: string): string => `kanshan-custom-masks:${acc}`;
const LEGACY_KEY = (acc: string): string => `kanshan-persona-custom:${acc}`;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function loadFromStorage(accountId: string): PersonaMask[] | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(KEY(accountId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as PersonaMask[];
  } catch {
    return null;
  }
}

function saveToStorage(accountId: string, masks: PersonaMask[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY(accountId), JSON.stringify(masks));
  } catch {
    // quota — ignored
  }
}

function migrateLegacy(accountId: string): PersonaMask[] | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(LEGACY_KEY(accountId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    saveToStorage(accountId, parsed as PersonaMask[]);
    return parsed as PersonaMask[];
  } catch {
    return null;
  }
}

export const usePersonaMasksStore = create<PersonaMasksState>((set, get) => ({
  customMasks: [],
  hydratedFor: null,

  hydrate(accountId) {
    if (get().hydratedFor === accountId) return;
    const masks = loadFromStorage(accountId) ?? migrateLegacy(accountId) ?? [];
    set({ customMasks: masks, hydratedFor: accountId });
  },

  addCustom(mask) {
    set((state) => {
      const customMasks = [...state.customMasks, mask];
      if (state.hydratedFor) saveToStorage(state.hydratedFor, customMasks);
      return { customMasks };
    });
  },

  removeCustom(id) {
    set((state) => {
      const customMasks = state.customMasks.filter((m) => m.id !== id);
      if (state.hydratedFor) saveToStorage(state.hydratedFor, customMasks);
      return { customMasks };
    });
  },
}));
