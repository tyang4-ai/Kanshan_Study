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
  KANSHAN_KICKOFF_TOOL_CALL,
} from './demo-content';

export async function seedKanshanChat(): Promise<number> {
  // Empty history → just `user:<prompt>`.
  const intent = `user:${KANSHAN_KICKOFF_PROMPT}`;
  const response: ReplayStep[] = [
    { event: 'reply', data: { text: KANSHAN_KICKOFF_REPLY } },
    { event: 'tool_call', data: KANSHAN_KICKOFF_TOOL_CALL },
  ];
  await writeCache('kanshan-chat', intent, response);
  return 1;
}
