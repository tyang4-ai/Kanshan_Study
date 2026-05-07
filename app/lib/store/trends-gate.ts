'use client';
import { create } from 'zustand';

// Workspace-level trends gate state. Surfaces outside the floating-window
// (e.g. the LeftRail bulletin card) push a pending trend here; the workspace
// shell mounts <TrendsConfirmModal> reading from this store so the gate can
// fire from anywhere. TrendsTab keeps its own local pending state because the
// confirm flow there is intra-tab.

export interface PendingTrend {
  title: string;
}

interface TrendsGateState {
  pending: PendingTrend | null;
  request: (trend: PendingTrend) => void;
  clear: () => void;
}

export const useTrendsGateStore = create<TrendsGateState>((set) => ({
  pending: null,
  request: (trend) => set({ pending: trend }),
  clear: () => set({ pending: null }),
}));
