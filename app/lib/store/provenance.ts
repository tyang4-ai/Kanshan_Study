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
  // R2 judge fix (李笛 P0 2026-05-12): cross-fox awareness. When fox B reacts
  // to an entry from fox A (e.g. 看墨 avoids a 看心 flag), record the link so
  // the surface UI can show "X 在 Y 时绕开此段".
  relatedTo?: string;
  // Optional short tag describing the cross-fox action (e.g. 'avoided').
  // Read by MarginSealPopover to render a footnote line.
  relatedAction?: string;
}

interface ProvenanceState {
  entries: ProvenanceEntry[];
  add: (e: Omit<ProvenanceEntry, 'id' | 'at'>) => ProvenanceEntry;
  remove: (id: string) => void;
  clear: () => void;
}

let counter = 0;

export const useProvenanceStore = create<ProvenanceState>((set) => ({
  entries: [],
  add: (e) => {
    const created: ProvenanceEntry = {
      ...e,
      id: `prov-${Date.now()}-${(counter++).toString(36)}`,
      at: Date.now(),
    };
    set((s) => ({ entries: [...s.entries, created] }));
    // R3 (李笛 P1 2026-05-12): bump the cross-fox event counter on every entry
    // that links to another fox's prior entry. Async import keeps last-visit
    // store off the server bundle hot path; best-effort if HMR breaks the link.
    if (created.relatedTo && typeof window !== 'undefined') {
      import('./last-visit')
        .then(({ useLastVisitStore }) => {
          useLastVisitStore.getState().incrementCrossFoxEvent();
        })
        .catch(() => { /* no-op */ });
    }
    return created;
  },
  remove: (id) => set((s) => ({ entries: s.entries.filter((x) => x.id !== id) })),
  clear: () => set(() => ({ entries: [] })),
}));

/**
 * R2 judge fix (李笛 P0 2026-05-12): cross-fox lookup helpers.
 *
 * `findCrossFoxFollowups(entryId)` returns entries that linked back to the
 * given entry via `relatedTo`. Used by MarginSealPopover to show e.g.
 * "看墨 已在重写时绕开此段" beneath a 看心 flag chit.
 */
export function findCrossFoxFollowups(entryId: string): ProvenanceEntry[] {
  return useProvenanceStore.getState().entries.filter((e) => e.relatedTo === entryId);
}

/**
 * Return all 看心 `flagged` entries whose excerpt appears in the given source
 * text. Used by VoiceDiffPanel after a successful rewrite to mark which 看心
 * flags 看墨 had to navigate around.
 */
export function findXinFlagsInRange(sourceText: string): ProvenanceEntry[] {
  if (!sourceText) return [];
  return useProvenanceStore.getState().entries.filter(
    (e) =>
      e.fox === 'xin' &&
      e.kind === 'flagged' &&
      e.excerpt &&
      sourceText.includes(e.excerpt),
  );
}

/**
 * R3 cross-fox edge #2 (李笛 P0 2026-05-12): find the most-recent 看心 flag
 * whose excerpt is a substring of (or contained in) the given excerpt.
 * Used by 看水 citation-insert to record a `relatedTo` link, so MarginSealPopover
 * can later render "看水 已补出处" beneath a 看心 flag chit.
 */
export function findOverlappingXinFlag(excerpt: string): string | undefined {
  if (!excerpt) return undefined;
  const entries = useProvenanceStore.getState().entries;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.fox !== 'xin' || e.kind !== 'flagged' || !e.excerpt) continue;
    if (excerpt.includes(e.excerpt) || e.excerpt.includes(excerpt)) return e.id;
  }
  return undefined;
}

/**
 * R3 cross-fox edge #3 (李笛 P0 2026-05-12): aggregate provenance counts by
 * fox for the ReturningVisitorBubble. The bubble picks its glow color based
 * on the most-active fox: 看心 flagged > 看水 sourced > 看典 default.
 */
export function getProvenanceSummary(): { xinFlags: number; shuiSourced: number; moAvoided: number } {
  const entries = useProvenanceStore.getState().entries;
  let xinFlags = 0, shuiSourced = 0, moAvoided = 0;
  for (const e of entries) {
    if (e.fox === 'xin' && e.kind === 'flagged') xinFlags++;
    else if (e.fox === 'shui' && e.kind === 'sourced') shuiSourced++;
    else if (e.fox === 'mo' && e.relatedAction === 'avoided') moAvoided++;
  }
  return { xinFlags, shuiSourced, moAvoided };
}

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
