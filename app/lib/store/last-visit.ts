'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// R2 judge fix (李笛 P0 2026-05-12): "关浏览器一周后回来狐狸还认得我吗?" —
// upgrade from sessionStorage to localStorage with explicit decay.
// R3 update (李笛 P0/P1 2026-05-12 night): schema v2 — `lastFilename` (single
// value) → `lastVisits` (array capped at 5). Adds `sessionCount` (incremented
// once per browser-tab mount) and `crossFoxEventCount` (incremented every time
// a fox's action triggers a `relatedTo` link to another fox's prior entry).
// Both surface in StatsTab so judges can see CPS-style measurement at demo time.

export interface VisitEntry {
  filename: string;
  topicSnippet: string;
  at: number;
}

export interface LastVisitState {
  lastVisits: VisitEntry[];
  /** Optional concern field — placeholder for future server-recorded notes. */
  lastConcern: string | null;
  /** Marks the current session as having already dismissed the bubble. */
  dismissed: boolean;
  /** Incremented once per tab mount; surfaces in stats tab as 「回访次数」. */
  sessionCount: number;
  /** Bumped whenever a fox records a `relatedTo` cross-fox entry. */
  crossFoxEventCount: number;
  /** R3 trend "→ 原帖" click counter (吴伟 P2 2026-05-12) — feeds StatsTab. */
  trendOutboundClicks: number;

  recordVisit: (visit: { filename: string; topicSnippet: string }) => void;
  setConcern: (concern: string) => void;
  dismiss: () => void;
  incrementSessionCount: () => void;
  incrementCrossFoxEvent: () => void;
  incrementTrendOutbound: () => void;
  reset: () => void;
}

const SNIPPET_LEN = 40;
const VISITS_CAP = 5;

const initialState = {
  lastVisits: [] as VisitEntry[],
  lastConcern: null,
  dismissed: false,
  sessionCount: 0,
  crossFoxEventCount: 0,
  trendOutboundClicks: 0,
} satisfies Pick<
  LastVisitState,
  'lastVisits' | 'lastConcern' | 'dismissed' | 'sessionCount' | 'crossFoxEventCount' | 'trendOutboundClicks'
>;

export const useLastVisitStore = create<LastVisitState>()(
  persist(
    (set) => ({
      ...initialState,
      recordVisit: ({ filename, topicSnippet }) =>
        set((s) => {
          // Drop any existing entry for the same filename (upsert semantics)
          // and push the freshest snapshot to the front. Cap at 5 entries so
          // the bubble can render "你最近在写 A、B、C 三条线" without growing
          // unbounded localStorage.
          const filtered = s.lastVisits.filter((v) => v.filename !== filename);
          const next: VisitEntry = {
            filename,
            topicSnippet: topicSnippet.slice(0, SNIPPET_LEN),
            at: Date.now(),
          };
          const lastVisits = [next, ...filtered].slice(0, VISITS_CAP);
          return { lastVisits, dismissed: false };
        }),
      setConcern: (concern) => set(() => ({ lastConcern: concern })),
      dismiss: () => set(() => ({ dismissed: true })),
      incrementSessionCount: () => set((s) => ({ sessionCount: s.sessionCount + 1 })),
      incrementCrossFoxEvent: () => set((s) => ({ crossFoxEventCount: s.crossFoxEventCount + 1 })),
      incrementTrendOutbound: () => set((s) => ({ trendOutboundClicks: s.trendOutboundClicks + 1 })),
      reset: () => set(() => initialState),
    }),
    {
      name: 'kanshan-last-visit',
      version: 2,
      // v1 → v2 migration: collapse old `lastFilename: string | null` into a
      // single-element `lastVisits` array, default the new counters to 0.
      migrate: (persistedState, fromVersion) => {
        if (!persistedState || typeof persistedState !== 'object') return initialState;
        const s = persistedState as Record<string, unknown>;
        if (fromVersion < 2) {
          const filename = s.lastFilename as string | undefined;
          const topicSnippet = (s.lastTopicSnippet as string | undefined) ?? '';
          const at = (s.lastVisitAt as number | undefined) ?? Date.now();
          const lastVisits: VisitEntry[] = filename
            ? [{ filename, topicSnippet, at }]
            : [];
          return {
            lastVisits,
            lastConcern: (s.lastConcern as string | null) ?? null,
            dismissed: (s.dismissed as boolean) ?? false,
            sessionCount: 0,
            crossFoxEventCount: 0,
            trendOutboundClicks: 0,
          } as LastVisitState;
        }
        return persistedState as LastVisitState;
      },
    },
  ),
);

/** Returns the most recent entry (or null) for the bubble's primary line. */
export function getMostRecentVisit(state: LastVisitState): VisitEntry | null {
  return state.lastVisits[0] ?? null;
}

// R3 (李笛 / 徐诗 P1 2026-05-12): cross-device mirror via /api/visit-state.
// On mount, hydrate from server if newer. On every state change, debounced
// PUT to server every 30s. Degrades to localStorage-only when 401 (no
// session) or 503 (no SUPABASE_DB_URL) — never breaks the local UX.

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastServerSyncAt = 0;

export async function hydrateFromServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const res = await fetch('/api/visit-state');
    if (!res.ok) return;
    const data = await res.json() as {
      lastVisits?: VisitEntry[];
      sessionCount?: number;
      crossFoxEventCount?: number;
      trendOutboundClicks?: number;
      updatedAt?: number;
    };
    if (!data || typeof data !== 'object') return;
    const local = useLastVisitStore.getState();
    const localLast = local.lastVisits[0]?.at ?? 0;
    const serverLast = data.lastVisits?.[0]?.at ?? 0;
    if (serverLast > localLast) {
      // Server is newer — pull. (We don't reset `dismissed`; that's session UI.)
      useLastVisitStore.setState({
        lastVisits: (data.lastVisits ?? []).slice(0, 5),
        sessionCount: data.sessionCount ?? local.sessionCount,
        crossFoxEventCount: data.crossFoxEventCount ?? local.crossFoxEventCount,
        trendOutboundClicks: data.trendOutboundClicks ?? local.trendOutboundClicks,
      });
      lastServerSyncAt = data.updatedAt ?? Date.now();
    }
  } catch {
    /* offline / no auth / no db — fine, stays local */
  }
}

export function schedulePushToServer(delayMs = 30_000): void {
  if (typeof window === 'undefined') return;
  if (pushTimer != null) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    pushTimer = null;
    const s = useLastVisitStore.getState();
    try {
      await fetch('/api/visit-state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastVisits: s.lastVisits,
          sessionCount: s.sessionCount,
          crossFoxEventCount: s.crossFoxEventCount,
          trendOutboundClicks: s.trendOutboundClicks,
        }),
      });
      lastServerSyncAt = Date.now();
    } catch {
      /* offline / no auth — fine, stays local */
    }
  }, delayMs);
}

/** For tests / verification. */
export function _lastServerSyncAt(): number {
  return lastServerSyncAt;
}

/** Returns true if the most-recent visit is in the "returning visitor" window:
 *  ≥ minHours since last visit, ≤ maxDays. Below the floor means it's the
 *  same session; above the ceiling means the fox-glow welcome is stale. */
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
