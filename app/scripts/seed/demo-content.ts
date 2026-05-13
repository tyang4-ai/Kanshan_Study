// Locked demo content. The seed script + the runtime route handlers must
// agree on these strings — runtime cache lookups canonicalize the user's
// inputs against these reference values.
//
// Demo-day rewrite (2026-05-13): swapped from the radiogenomics demo to the
// glioblastoma (GBM) walkthrough. Paragraphs match the body in
// `app/content/seed/default-document.html.ts` so the persona-panel + voice
// seeds key off the same prose the judge selects on screen.

export const DEMO_PARAGRAPH = `目前公认的一线方案仍然是 Stupp 方案：术后放疗 60 Gy 同步 + 辅助替莫唑胺 (TMZ) 6 个周期。这套方案来自 2005 年 NEJM 那篇里程碑论文,中位总生存 (OS) 从单纯放疗的 12.1 个月提高到 14.6 个月,2 年 OS 从 10.4% 提高到 26.5%。`;

// CLIMACTIC_PARAGRAPH is the absolutist sentence deliberately planted in the
// walkthrough's Step 4 paste block. 看心 flags it (red wavy underline) in
// Step 5; Step 7 then asks the judge to run 看墨 ON THIS SAME paragraph so
// the cross-fox arrow fires: 看墨 records relatedAction='avoided' linking
// to 看心's flag, and the MarginSealPopover shows "看墨 已在重写时绕开此段".
export const CLIMACTIC_PARAGRAPH = `对 MGMT 甲基化阳性的患者，替莫唑胺一定能根治胶质母细胞瘤，5 年存活率 100%。`;

export const VOICE_BULLETS = `想写一段：胶质母细胞瘤一线治疗 2025
- Stupp 方案仍是标准
- MGMT 甲基化决定 TMZ 收益
- TTFields 把中位 OS 推到 20.9 月
- 免疫治疗在复发场景多失败`;

export const FOLLOWUP_A = '中位 OS 14.6 个月对家属来说意味着什么？能不能给一个范围？';
export const FOLLOWUP_B = '如果换成家属能听懂的口吻，应该怎么改？';

export const CUSTOM_MASK_DESCRIPTION = '三甲医院神外主任查房，对住院医师的口吻';

export const DEMO_USER_ID = 'guwanxi';

// 看山 orchestrator kickoff intent — matches the prompt the judge types in
// Step 0 of the walkthrough. The seed below pre-generates the tool_call
// directives so 看水 + 看典 fire instantly with the right query strings.
export const KANSHAN_KICKOFF_PROMPT = '帮我策划一篇关于胶质母细胞瘤一线治疗最新进展的回答';

export const KANSHAN_KICKOFF_REPLY = `好的。先理一下结构 ——

1. 病种定义 + 流行病学（一段）
2. 一线方案：Stupp 方案 + MGMT 甲基化的预测意义（两段）
3. 维持期：TTFields（一段）
4. 家属沟通点：中位 OS、生存质量、复发预期（一段）
5. 复发场景：免疫治疗 + 贝伐珠单抗为什么不行（一段）

我同时打开看水（查找最近的临床指南）和看典（你自己的 MGMT 速查 + Stupp 综述笔记）—— 它们的结果几秒后会一起到。`;

export const KANSHAN_KICKOFF_TOOL_CALL = {
  tool: 'orchestrate',
  args: {
    open: [
      { kind: 'research', scope: 'deep', query: '胶质母细胞瘤 一线治疗 2025' },
      { kind: 'vault', query: '胶质母细胞瘤' },
    ],
  },
};
