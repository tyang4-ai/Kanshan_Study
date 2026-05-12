'use client';
import { create } from 'zustand';

export type AiErrorSeverity = 'error' | 'notice';

export interface AiError {
  id: number;
  message: string;
  status?: number;
  url?: string;
  ts: number;
  // R3 (史中 P0 2026-05-12): notice variant — amber border instead of red.
  // Used for graceful-degradation notices like "看墨 3 轮未及 0.85, 采用最佳稿"
  // and cross-fox "看墨已绕开看心 N 处" so a clickthrough judge doesn't read
  // them as failures.
  severity?: AiErrorSeverity;
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
      current: { id: nextId++, ts: Date.now(), severity: 'error', ...e },
    })),
  dismiss: () => set(() => ({ current: null })),
}));
