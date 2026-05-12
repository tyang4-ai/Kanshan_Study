'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// R2 judge fix (李笛 P0 2026-05-12): "关浏览器一周后回来狐狸还认得我吗?" —
// upgrade from sessionStorage (tab-scoped, dies on close) to localStorage with
// an explicit decay window. Records the last document the 答主 was working on
// so ReturningVisitorBubble can surface a contextual welcome on the next
// session. localStorage survives browser restarts; the 4h..30d gating prevents
// "you were just here 5 min ago" flicker and "you haven't been here in a
// year, here's a fossil" cringe.
//
// Long-term: replace with a Supabase table for cross-device continuity. The
// gnarly UX path is the same so the bubble + read API don't need to change.

export interface LastVisitState {
  /** Filename of the doc the 答主 was last editing. */
  lastFilename: string | null;
  /** First N chars of doc text content. */
  lastTopicSnippet: string | null;
  /** Last edit timestamp (ms since epoch). */
  lastVisitAt: number | null;
  /** Optional concern field — placeholder for future server-recorded notes. */
  lastConcern: string | null;
  /** Marks the current session as having already dismissed the bubble. */
  dismissed: boolean;

  recordVisit: (visit: { filename: string; topicSnippet: string }) => void;
  setConcern: (concern: string) => void;
  dismiss: () => void;
  reset: () => void;
}

const SNIPPET_LEN = 40;

const initialState = {
  lastFilename: null,
  lastTopicSnippet: null,
  lastVisitAt: null,
  lastConcern: null,
  dismissed: false,
} satisfies Pick<LastVisitState, 'lastFilename' | 'lastTopicSnippet' | 'lastVisitAt' | 'lastConcern' | 'dismissed'>;

export const useLastVisitStore = create<LastVisitState>()(
  persist(
    (set) => ({
      ...initialState,
      recordVisit: ({ filename, topicSnippet }) =>
        set(() => ({
          lastFilename: filename,
          lastTopicSnippet: topicSnippet.slice(0, SNIPPET_LEN),
          lastVisitAt: Date.now(),
          // New visit resets the dismissed flag so a fresh re-entry next session
          // sees the bubble (one acknowledgment per session, not forever).
          dismissed: false,
        })),
      setConcern: (concern) => set(() => ({ lastConcern: concern })),
      dismiss: () => set(() => ({ dismissed: true })),
      reset: () => set(() => initialState),
    }),
    {
      name: 'kanshan-last-visit',
      version: 1,
    },
  ),
);

/** Returns true if the persisted lastVisitAt is in the "returning visitor"
 *  window: ≥ minHours since last visit, ≤ maxDays. Below the floor means it's
 *  the same session; above the ceiling means the fox-glow welcome is stale. */
export function isWithinReturnWindow(
  lastVisitAt: number | null,
  now = Date.now(),
  minHours = 4,
  maxDays = 30,
): boolean {
  if (lastVisitAt == null) return false;
  const diff = now - lastVisitAt;
  const minMs = minHours * 60 * 60 * 1000;
  const maxMs = maxDays * 24 * 60 * 60 * 1000;
  return diff >= minMs && diff <= maxMs;
}
