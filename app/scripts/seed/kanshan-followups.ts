// 看山 followup seeds. After Step 0 of the walkthrough fires the GBM
// kickoff, the demo doc invites the judge to keep asking — these are the
// 6 followups it suggests. Each gets pre-seeded into demo_cache so the
// judge clicks/copies one and hits cache instantly.
//
// Intent format must match `intentKey` in
// `app/app/api/agents/kanshan/chat/route.ts:60`:
//   user:<kickoff>||kanshan:<step0 reply>||user:<followup>

import { writeCache } from '@/lib/cache/store';
import type { ReplayStep } from '@/lib/cache/replay';
import {
  KANSHAN_KICKOFF_PROMPT,
  KANSHAN_KICKOFF_REPLY,
} from './demo-content';

interface FollowupSeed {
  followup: string;
  reply: string;
  toolCall: {
    tool: string;
    args?: Record<string, unknown>;
  };
}

const FOLLOWUPS: FollowupSeed[] = [
  {
    followup: '再帮我多找几条最近的临床试验',
    reply: '好的 · 我让看水转尽考模式，把范围拉到 III 期临床试验招募 + 2024 后发表的随访数据。',
    toolCall: {
      tool: 'open_research',
      args: { scope: 'thorough', query: '胶质母细胞瘤 III期临床试验 2024' },
    },
  },
  {
    followup: '这一段对家属来说还是太专业了 · 怎么改',
    reply: '让我召集看文 4 位读者面具看看 —— 其中急诊家属那位会指给你听哪一句太硬。',
    toolCall: { tool: 'open_persona' },
  },
  {
    followup: '有没有中文知乎答主写过这块',
    reply: '我让看水快查一下，挑相关性高的几位答主回来。',
    toolCall: {
      tool: 'open_research',
      args: { scope: 'quick', query: '胶质母细胞瘤 知乎答主' },
    },
  },
  {
    followup: '帮我把 Stupp 方案那段口语化一点',
    reply: '看墨接手 —— 用你自己的语风做声纹对齐，把术语翻译成家属能听懂的口吻。',
    toolCall: { tool: 'open_voice_diff' },
  },
  {
    followup: '看心标出来那句怎么改',
    reply: '让看文模拟「怀疑型读者」给一个软化版本，再让看墨把语风对齐一下。',
    toolCall: { tool: 'open_persona' },
  },
  {
    followup: '看势上有什么相关问题在涨',
    reply: '我让看势打开热榜雷达 —— 与神经肿瘤、TTFields 医保、MGMT 检测相关的会浮在顶部。',
    toolCall: { tool: 'open_trends' },
  },
];

export async function seedKanshanFollowups(): Promise<number> {
  let count = 0;
  for (const f of FOLLOWUPS) {
    const intent = `user:${KANSHAN_KICKOFF_PROMPT}||kanshan:${KANSHAN_KICKOFF_REPLY}||user:${f.followup}`;
    const response: ReplayStep[] = [
      { event: 'reply', data: { text: f.reply } },
      { event: 'tool_call', data: f.toolCall },
    ];
    await writeCache('kanshan-chat', intent, response);
    count += 1;
  }
  return count;
}
