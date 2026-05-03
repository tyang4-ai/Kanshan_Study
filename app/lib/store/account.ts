'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AccountId = 'me' | 'guwanxi';

interface AccountState {
  active: AccountId;
  switchTo: (id: AccountId) => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      active: 'me',
      switchTo: (id) => set(() => ({ active: id })),
    }),
    { name: 'kanshan-account', storage: createJSONStorage(() => localStorage) }
  )
);
