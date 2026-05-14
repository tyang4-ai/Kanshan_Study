// 看山 orchestrator seed. Pre-canned response for the GBM walkthrough Step 0
// kickoff prompt. Static — does not call the LLM. Just writes the (intent,
// response) pair into demo_cache so the route handler's `withCache` lookup
// hits instantly.
//
// Intent format must match `intentKey` in
// `app/app/api/agents/kanshan/chat/route.ts:60`.

import { writeCache } from '@/lib/cache/store';
import type { ReplayStep } from '@/lib/cache/replay';
import {
  KANSHAN_KICKOFF_PROMPT,
  KANSHAN_KICKOFF_REPLY,
} from './demo-content';

export async function seedKanshanChat(): Promise<number> {
  // Empty history → just `user:<prompt>`.
  const intent = `user:${KANSHAN_KICKOFF_PROMPT}`;
  // R5 (周源 / emmett P0 2026-05-13): emit TWO sequential `tool_call` events
  // so the client dispatcher fans out 看水 then 看典 with the staggered
  // animation. The router code ALSO supports a single `orchestrate` tool
  // call (KanshanOrchestrationCall) which lives in lib/agents/kanshan-router.ts
  // for code-review visibility — but for the cached demo we use the sequential
  // SSE path because the dispatcher's per-tool_call CoT animation lands better.
  const response: ReplayStep[] = [
    { event: 'reply', data: { text: KANSHAN_KICKOFF_REPLY } },
    {
      event: 'tool_call',
      data: {
        tool: 'open_research',
        args: { scope: 'deep', query: '胶质母细胞瘤 一线治疗 最新进展' },
      },
    },
    {
      event: 'tool_call',
      data: {
        tool: 'open_vault',
        args: { query: '胶质母细胞瘤' },
      },
    },
  ];
  await writeCache('kanshan-chat', intent, response);
  return 1;
}
