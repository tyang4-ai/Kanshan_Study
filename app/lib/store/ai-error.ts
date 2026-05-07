'use client';
import { create } from 'zustand';

export interface AiError {
  id: number;
  message: string;
  status?: number;
  url?: string;
  ts: number;
}

interface AiErrorState {
  current: AiError | null;
  push: (e: Omit<AiError, 'id' | 'ts'>) => void;
  dismiss: () => void;
}

let nextId = 1;

// Single-slot store: subsequent errors REPLACE the current one rather than
// stacking. UI shows at most one toast at a time.
export const useAiErrorStore = create<AiErrorState>((set) => ({
  current: null,
  push: (e) =>
    set(() => ({
      current: { id: nextId++, ts: Date.now(), ...e },
    })),
  dismiss: () => set(() => ({ current: null })),
}));
