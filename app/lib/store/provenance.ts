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

/** Lookup a single provenance entry by id. Returns null if missing. */
export function getProvenance(id: string): ProvenanceEntry | null {
  return useProvenanceStore.getState().entries.find((e) => e.id === id) ?? null;
}

/**
 * Find the most recent provenance entry that matches a margin-seal chit
 * (kind + excerpt fragment). Margin-seal kinds map onto provenance kinds:
 *   reviewed → hedge   (看心 softened a claim)
 *   flag     → flagged (看心 flagged unsourced claim)
 *   sourced  → sourced (看水 inserted a citation)
 * Matching prefers exact excerpt equality, then substring containment in
 * either direction (chit text often shows just the marker glyph 审/疑/据).
 */
export function findProvenanceForChit(
  marginKind: 'reviewed' | 'flag' | 'sourced',
  excerpt: string,
): ProvenanceEntry | null {
  const targetKind: ProvenanceKind =
    marginKind === 'reviewed' ? 'hedge' : marginKind === 'flag' ? 'flagged' : 'sourced';
  const entries = useProvenanceStore.getState().entries.filter((e) => e.kind === targetKind);
  if (entries.length === 0) return null;
  const exact = entries.find((e) => e.excerpt === excerpt);
  if (exact) return exact;
  const contains = entries.find(
    (e) => e.excerpt.includes(excerpt) || excerpt.includes(e.excerpt),
  );
  if (contains) return contains;
  return entries[entries.length - 1];
}
