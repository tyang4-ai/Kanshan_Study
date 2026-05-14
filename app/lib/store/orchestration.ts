'use client';
import { create } from 'zustand';
import type { FoxId } from '@/lib/foxes/registry';

// R5 (P0 2026-05-13): orchestration prominence. The OrchestrationStrip
// reads from this store to render a live trail of which foxes are currently
// active and what status they're in. Each fox panel calls `update(foxId,
// status)` on key milestones (search complete, vault load done, xin scan
// finished, voice diff accept, etc.) so judges visibly see 看山 → 看水 →
// 看典 → 看心 light up in sequence on the same document.

export interface OrchestrationEntry {
  foxId: FoxId;
  status: string;
  updatedAt: number;
}

interface OrchestrationState {
  active: Record<string, OrchestrationEntry>;
  update: (foxId: FoxId, status: string) => void;
  clear: (foxId: FoxId) => void;
  clearAll: () => void;
}

export const useOrchestrationStore = create<OrchestrationState>((set) => ({
  active: {},
  update: (foxId, status) =>
    set((s) => ({
      active: { ...s.active, [foxId]: { foxId, status, updatedAt: Date.now() } },
    })),
  clear: (foxId) =>
    set((s) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [foxId]: _drop, ...rest } = s.active;
      return { active: rest };
    }),
  clearAll: () => set(() => ({ active: {} })),
}));
