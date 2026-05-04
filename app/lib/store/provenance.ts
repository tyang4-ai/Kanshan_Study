'use client';
import { create } from 'zustand';
import type { FoxId } from '@/lib/foxes/registry';

export type ProvenanceKind = 'ai-touched' | 'claim' | 'hedge' | 'sourced' | 'flagged';

export interface ProvenanceEntry {
  id: string;
  kind: ProvenanceKind;
  excerpt: string;
  fox: FoxId;
  at: number;
}

interface ProvenanceState {
  entries: ProvenanceEntry[];
  add: (e: Omit<ProvenanceEntry, 'id' | 'at'>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

let counter = 0;

export const useProvenanceStore = create<ProvenanceState>((set) => ({
  entries: [],
  add: (e) =>
    set((s) => ({
      entries: [
        ...s.entries,
        {
          ...e,
          id: `prov-${Date.now()}-${(counter++).toString(36)}`,
          at: Date.now(),
        },
      ],
    })),
  remove: (id) => set((s) => ({ entries: s.entries.filter((x) => x.id !== id) })),
  clear: () => set(() => ({ entries: [] })),
}));
