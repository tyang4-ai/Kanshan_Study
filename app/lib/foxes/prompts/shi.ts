// 看势 (shi) — trends radar (Bearer-token hot-list API)
//
// 看势 does NOT make LLM calls. It fetches 知乎 hot-list items via:
//   - Bearer-token endpoint on `developer.zhihu.com/api/v1/content/hot_list` —
//     wired through `app/lib/zhihu.ts:getHotList`.
//   - Fixture fallback to `app/content/zhihu-fixtures/hot-list-{relevant,all}.json`
//     in mock mode.
//
// The `app/components/floating/TrendsTab.tsx` UI renders rows with "→ 原帖"
// links. When a row is clicked into ResearchTab, the 清朗 第二阶段 红线 is
// enforced via `TrendsConfirmModal` + per-insert 看心 审议 (origin='trend').
//
// SYSTEM_PROMPT intentionally empty: 看势 is API surfacing + UI gate, not LLM.

export const SYSTEM_PROMPT = '' as const;
