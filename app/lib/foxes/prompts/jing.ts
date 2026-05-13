// 看镜 (jing) — post-publish analytics (mock data)
//
// 看镜 does NOT make LLM calls in the MVP. It renders 4 sub-tabs (overview /
// engagement / audience / income) from `app/content/seed/*.json` mock data —
// see `app/components/floating/StatsTab.tsx` + the four `app/components/stats/*Tab.tsx`
// children. The CPS-style returning-visitor counters
// (`sessionCount`, `crossFoxEventCount`, `trendOutboundClicks`) feed into the
// engagement tab via `app/lib/store/last-visit.ts`.
//
// SYSTEM_PROMPT intentionally empty: 看镜 is data display, not generation.
// A future post-MVP version could add LLM narration of trend deltas; if/when
// that ships, put the prompt here.

export const SYSTEM_PROMPT = '' as const;
