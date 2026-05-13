// 看水 (shui) — research grounding (citation-anchored)
//
// 看水 does NOT make LLM calls. It surfaces real evidence through retrieval:
//   - Bearer-token endpoints on `developer.zhihu.com` (`zhihu_search`,
//     `global_search`) — wired through `app/lib/zhihu.ts:searchZhihu` /
//     `searchGlobal`.
//   - Fixture fallback to `app/content/seed/research-radiogenomics.json`
//     when no live results return.
//
// The `app/components/floating/ResearchTab.tsx` UI composes a citation-trailed
// research report from the search hits + author vault overlap (via `findOverlappingXinFlag`
// for cross-fox provenance) — but no LLM is in this loop.
//
// SYSTEM_PROMPT intentionally empty: 看水's "intelligence" is search + ranking,
// not generation. Listed in this directory so the architectural map at
// `lib/foxes/prompts/` covers all 9 foxes (颜鑫 R3 P1).

export const SYSTEM_PROMPT = '' as const;
