// 看镜 chat — answers 答主's questions about their stats using Kimi/DeepSeek.
// Context passed in by the client: last-visit telemetry + a mock set of
// published-article metrics (real metrics endpoint would land post-MVP).
//
// Cache mode honors public-gate so anonymous traffic on the live site can't
// burn the operator's credits; otherwise live every call (no replay cache —
// answers are too dynamic to be worth caching).

import { z } from 'zod';
import { chat } from '@/lib/llm';
import { SYSTEM_PROMPT } from '@/lib/foxes/prompts/jing';
import { proxyAuth } from '@/lib/apikey/proxy';
import { requireRateLimitOk, releaseConcurrent } from '@/lib/ratelimit/check';
import { scrubErrorForClient } from '@/lib/errors/scrub';
import { cookies } from 'next/headers';

const ContextSchema = z.object({
  sessionCount: z.number(),
  crossFoxEventCount: z.number(),
  trendOutboundClicks: z.number(),
  trackedDocsCount: z.number(),
});

const Body = z.object({
  userMessage: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(['user', 'jing']), content: z.string() }))
    .max(20)
    .optional(),
  context: ContextSchema.optional(),
});

async function getGuestId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get('kanshan-guest-id')?.value ?? null;
}

function contextBlock(ctx: z.infer<typeof ContextSchema> | undefined): string {
  if (!ctx) return '【本地工作台埋点】（暂无）';
  return [
    '【本地工作台埋点（仅本浏览器）】',
    `- 本会话编辑次数：${ctx.sessionCount}`,
    `- 跨狐狸联动次数：${ctx.crossFoxEventCount}（比如看墨重写后看心又审过）`,
    `- 看势 → 知乎导流次数：${ctx.trendOutboundClicks}`,
    `- 当前在写的文档线：${ctx.trackedDocsCount}`,
  ].join('\n');
}

// Stand-in for the real 知乎 metrics endpoint (post-MVP). Kept inline so the
// chat has *something* concrete to talk about during demo. Numbers are
// deliberately mock-flagged in the prompt block so 看镜 hedges accordingly.
const MOCK_PUBLISHED = [
  '【已发布作品聚合（MOCK · 演示数字）】',
  '- 近 30 日新增阅读 12,408（同比 +18%）',
  '- 平均读完率 41%（同比 -6pp，是「最反常的一项」）',
  '- 收藏 / 阅读比 4.2%（同比 +0.9pp）',
  '- 互动率（评论 + 点赞 / 阅读）2.1%（同比 -0.4pp）',
  '- 月收益 ¥187（同比 +9%）',
  '- 流量来源：知乎首页 58% · 搜索 22% · 推荐 14% · 站外 6%',
].join('\n');

export async function POST(req: Request): Promise<Response> {
  const blocked = await requireRateLimitOk(req);
  if (blocked) return blocked;
  const guestId = await getGuestId();

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    if (guestId) await releaseConcurrent(guestId);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let creds: ReturnType<typeof proxyAuth>;
  try {
    creds = proxyAuth(req);
  } catch (err) {
    if (guestId) await releaseConcurrent(guestId);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: scrubErrorForClient(msg) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Public-gate: no live call for anonymous traffic on shared deploy. Echo a
  // fallback that still teaches the user what 看镜 does without spending creds.
  if (creds.source === 'gated') {
    if (guestId) await releaseConcurrent(guestId);
    return new Response(
      JSON.stringify({
        text:
          '看镜在公开演示模式下不调用 LLM。在「设置 · LLM Provider」里输入你的 Kimi 或 DeepSeek 密钥即可解锁实时复盘。',
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'system',
      content: `${MOCK_PUBLISHED}\n\n${contextBlock(body.context)}`,
    },
  ];
  for (const turn of body.history ?? []) {
    messages.push({
      role: turn.role === 'user' ? 'user' : 'assistant',
      content: turn.content,
    });
  }
  messages.push({ role: 'user', content: body.userMessage });

  try {
    const text = await chat(messages, {
      apiKey: creds.key,
      provider: creds.provider,
      temperature: 0.4,
      maxTokens: 600,
    });
    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: scrubErrorForClient((err as Error).message) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  } finally {
    if (guestId) await releaseConcurrent(guestId);
  }
}
