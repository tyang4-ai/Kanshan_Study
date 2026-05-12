'use client';
import { create } from 'zustand';

interface DebateConfigState {
  proRoleId: string;
  conRoleId: string;
  hydratedFor: string | null;

  hydrate: (accountId: string) => void;
  setProRole: (id: string) => void;
  setConRole: (id: string) => void;
  swap: () => void;
}

const KEY = (acc: string): string => `kanshan-debate-config:${acc}`;

const DEFAULT_PRO = 'expert';
const DEFAULT_CON = 'boundary';

interface PersistShape {
  proRoleId: string;
  conRoleId: string;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function loadFromStorage(accountId: string): PersistShape | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(KEY(accountId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof (parsed as PersistShape).proRoleId !== 'string' ||
      typeof (parsed as PersistShape).conRoleId !== 'string'
    ) {
      return null;
    }
    return parsed as PersistShape;
  } catch {
    return null;
  }
}

function saveToStorage(accountId: string, shape: PersistShape): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY(accountId), JSON.stringify(shape));
  } catch {
    // quota — ignored
  }
}

export const useDebateConfigStore = create<DebateConfigState>((set, get) => ({
  proRoleId: DEFAULT_PRO,
  conRoleId: DEFAULT_CON,
  hydratedFor: null,

  hydrate(accountId) {
    if (get().hydratedFor === accountId) return;
    const fromStorage = loadFromStorage(accountId);
    if (fromStorage) {
      set({
        proRoleId: fromStorage.proRoleId,
        conRoleId: fromStorage.conRoleId,
        hydratedFor: accountId,
      });
    } else {
      set({ proRoleId: DEFAULT_PRO, conRoleId: DEFAULT_CON, hydratedFor: accountId });
    }
  },

  setProRole(id) {
    set((state) => {
      if (state.proRoleId === id) return state;
      const next = { proRoleId: id, conRoleId: state.conRoleId };
      if (state.hydratedFor) saveToStorage(state.hydratedFor, next);
      return { proRoleId: id };
    });
  },

  setConRole(id) {
    set((state) => {
      if (state.conRoleId === id) return state;
      const next = { proRoleId: state.proRoleId, conRoleId: id };
      if (state.hydratedFor) saveToStorage(state.hydratedFor, next);
      return { conRoleId: id };
    });
  },

  swap() {
    set((state) => {
      const next = { proRoleId: state.conRoleId, conRoleId: state.proRoleId };
      if (state.hydratedFor) saveToStorage(state.hydratedFor, next);
      return next;
    });
  },
}));
