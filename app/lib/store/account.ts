'use client';
import { create } from 'zustand';

// Demo-day collapse (2026-05-13): single hard-coded persona. The 'me' account
// was removed entirely; every visitor inhabits 顾婉昔's workspace once their
// own 知乎 OAuth has settled the real identity at the auth layer.
export type AccountId = 'guwanxi';

interface AccountState {
  active: AccountId;
  switchTo: (id: AccountId) => void;
}

export const useAccountStore = create<AccountState>(() => ({
  active: 'guwanxi',
  // Kept as a no-op so legacy call sites (TitleBar ProfileChip → soon deleted,
  // any latent tour scripts) don't blow up during the transition.
  switchTo: () => undefined,
}));
