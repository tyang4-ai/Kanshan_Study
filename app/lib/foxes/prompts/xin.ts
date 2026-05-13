// 看心 (xin) — compliance / boundary review (rule-based detector + silent monitor)
//
// 看心 does NOT make LLM calls in the MVP. It runs a pure-rule detector
// (`app/lib/compliance/xin-detect.ts`) against the current paragraph and
// surfaces results in six places:
//   - `MarginSealChit` — gutter-rail markers for hedge / flagged / sourced
//   - `MarginSealPopover` — click-to-expand context line (uses
//     `findCrossFoxFollowups(entryId)` to show "看墨 已在重写时绕开此段")
//   - `InlineMark` TipTap mark — softens unsourced absolute medical/finance claims
//   - `CardCornerBadge` — vault entries that contain flagged sentences
//   - `ComplianceLine` — per-tab footer with locked compliance text
//   - `ComplianceStamp` — editor footer counters
//
// In the persona panel, 看心 is a silent monitor — a typing dot + ComplianceLine
// only, no chat messages (per CLAUDE.md "Locked decisions #12").
//
// The detector's ground truth lives in `app/scripts/xin-groundtruth.json`
// (100 examples) and the recall script in `app/scripts/xin-precision-recall.ts`.
// F1 ≥ 0.98 on the four label classes as of R3.
//
// SYSTEM_PROMPT intentionally empty: 看心 is rule-based + silent UI, not LLM.

export const SYSTEM_PROMPT = '' as const;
