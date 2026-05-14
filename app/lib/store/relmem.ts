'use client';
// r5 TASK I (李笛 P2 promoted to in-scope 2026-05-13): relational memory store.
// Holds annotations like "this sentence echoes 顾婉昔's 3-week-old IDH-野生型
// note" or "this contradicts the Stupp-2017 hedge stance." Populated by both
// the pre-seeded fixtures (cached demo path) AND the live BGE-M3 scanner
// (实时 BYO-key path). OrchestrationStrip subscribes and renders a chip per
// annotation.

import { create } from 'zustand';

export type RelMemKind = 'echo' | 'contradict';

export interface RelMemAnnotation {
  id: string;
  /** 'echo' → "和你 3 周前那篇 X 观点呼应"
   *  'contradict' → "和你 3 周前那篇 X 立场相反" */
  kind: RelMemKind;
  /** The sentence in the current draft that triggered the match. */
  anchor: string;
  /** Title of the vault entry / past visit that matched. */
  refTitle: string;
  /** Short excerpt from the matched entry, ≤ 80 chars. */
  refExcerpt: string;
  /** Cosine similarity that triggered the annotation (0–1). */
  similarity: number;
  /** Source — which path produced this annotation. */
  source: 'fixture' | 'live';
  at: number;
}

interface RelMemState {
  annotations: RelMemAnnotation[];
  add: (a: Omit<RelMemAnnotation, 'id' | 'at'>) => void;
  clear: () => void;
  /** Replace annotations whose source matches the given value. Used by the
   *  live scanner so each scan-tick evicts the last scan's hits. */
  replaceFromSource: (source: 'fixture' | 'live', next: Array<Omit<RelMemAnnotation, 'id' | 'at'>>) => void;
}

let counter = 0;

export const useRelMemStore = create<RelMemState>((set) => ({
  annotations: [],
  add: (a) =>
    set((s) => ({
      annotations: [
        ...s.annotations,
        { ...a, id: `relmem-${Date.now()}-${(counter++).toString(36)}`, at: Date.now() },
      ],
    })),
  clear: () => set(() => ({ annotations: [] })),
  replaceFromSource: (source, next) =>
    set((s) => {
      const preserved = s.annotations.filter((x) => x.source !== source);
      const fresh: RelMemAnnotation[] = next.map((a) => ({
        ...a,
        id: `relmem-${Date.now()}-${(counter++).toString(36)}`,
        at: Date.now(),
      }));
      return { annotations: [...preserved, ...fresh] };
    }),
}));
