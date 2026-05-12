'use client';
import { create } from 'zustand';
import type { FoxId } from '@/lib/foxes/registry';

interface DailyFoxPulseState {
  glowingFox: FoxId | null;
  setGlowingFox: (id: FoxId | null) => void;
}

export const useDailyFoxPulseStore = create<DailyFoxPulseState>((set) => ({
  glowingFox: null,
  setGlowingFox: (id) => set(() => ({ glowingFox: id })),
}));
