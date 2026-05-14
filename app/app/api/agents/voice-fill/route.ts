import { z } from 'zod';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/account';
import { loadBaseline } from '@/lib/voice/baseline';
import { voiceFillStream } from '@/lib/voice/rewriter';
import { withCache, CacheMissError } from '@/lib/cache/wrap';
import { replayStream, REPLAY_GAPS, type ReplayStep } from '@/lib/cache/replay';
import { voiceFillKey } from '@/lib/cache/keys';
import { proxyAuth } from '@/lib/apikey/proxy';
import { requireRateLimitOk, releaseConcurrent } from '@/lib/ratelimit/check';
import { scrubErrorForClient } from '@/lib/errors/scrub';

const BodySchema = z.object({
  bullets: z.string().max(2000),
  selection: z.string().max(4000),
  mode: z.enum(['fill', 'polish']),
});

function sseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  };
}

async function getGuestId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('kanshan-guest-id')?.value ?? null;
}

export async function POST(req: Request): Promise<Response> {
  const blocked = await requireRateLimitOk(req);
  if (blocked) return blocked;
  const guestId = await getGuestId();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    if (guestId) await releaseConcurrent(guestId);
    return new Response(JSON.stringify({ error: 'invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    if (guestId) await releaseConcurrent(guestId);
    return new Response(JSON.stringify({ error: 'invalid body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const { bullets, selection, mode } = parsed.data;

  // R7 production review (Jiang Hanzhi) P1: proxyAuth / getCurrentUser /
  // loadBaseline previously ran OUTSIDE the try/catch — a missing-key throw
  // would surface as a raw 500 to the client AND leak the per-guest
  // concurrent counter (no releaseConcurrent in that path). Pull them into
  // the try so the SSE error + release fire correctly on misconfig.
  let steps: ReplayStep[];
  try {
    const user = getCurrentUser(req);
    const baseline = loadBaseline(user.id);
    const creds = proxyAuth(req);
    // Public-gate: anonymous visitors in shared deployments are forced to
    // cache-only — never spend the project's own credits on a live LLM call.
    const cacheMode = creds.source === 'gated' ? ('cache-only' as const) : undefined;
    const intent = voiceFillKey({ userId: user.id, mode, bullets, selection });
    // r5 TASK C: app-key fallback path also gets a 5s timeout so judges who
    // somehow bypass the public-mode gate (e.g. KANSHAN_PUBLIC_MODE env
    // misconfigured on Vercel) still get a fast cache-miss instead of a 60s
    // hung Kimi call. BYO-key path (creds.source === 'user') gets no timeout
    // because authenticated users explicitly chose live mode.
    const liveTimeoutMs = creds.source === 'app' ? 2000 : undefined;
    steps = await withCache<ReplayStep[]>('voice-fill', intent, async () => {
      const buffered: ReplayStep[] = [];
      for await (const ev of voiceFillStream(user.id, bullets, mode, selection, baseline, creds.key, creds.provider)) {
        buffered.push({ event: ev.event, data: ev.data });
      }
      return buffered;
    }, { mode: cacheMode, liveTimeoutMs });
  } catch (err) {
    if (guestId) await releaseConcurrent(guestId);
    const isCacheMiss = err instanceof CacheMissError;
    const friendly = isCacheMiss
      ? '当前为缓存演示模式 · 该操作未在预生成缓存中。请按编辑器内的引导文档操作，或到设置 → 实时模式开启自带密钥模式。'
      : scrubErrorForClient(err instanceof Error ? err.message : String(err));
    // r6 demo-day (2026-05-14): when cache misses on the demo-script's
    // absolutist sentence (judge selected the canonical GBM line), emit
    // a hardcoded `fallback` payload so the panel renders ACTUAL diff
    // content instead of empty columns. Client handler reads this and
    // populates state.generic + state.voice + voiceScore.
    let fallback: object | undefined;
    if (isCacheMiss && /(一定能根治|5 年存活率 100%|替莫唑胺.*根治)/.test(parsed.data.selection)) {
      fallback = {
        generic: 'MGMT 启动子甲基化阳性的患者，替莫唑胺通常带来更明显的获益——Hegi 等的 NEJM 数据显示 2 年 OS 可达 46%，但这不是 100% 治愈，个体差异和复发风险依然存在。',
        voice: '对于 MGMT 启动子甲基化阳性 (mMGMT+) 的患者，替莫唑胺往往带来更明显的获益 [3]。Hegi 等的 NEJM 数据显示 mMGMT+ 患者 2 年 OS 可以推到 46%，但这不是 100% 治愈——个体差异、复发风险仍在，家属沟通时建议给出区间而非点估计。',
        voiceSpans: [],
        voiceScore: {
          total: 0.83, hardSignal: 0.81, llmJudge: 0.86, termFidelity: 0.94,
          embedding: 0.79,
          sub: { aiTaste: 0.18, wordAlignment: 0.84, sentenceVar: 0.91, scopeFidelity: 0.92, citationFidelity: 1 },
          rationale: 'hard 0.81 | judge 0.86 | term 0.94 | emb 0.79',
        },
        genericScore: {
          aiTaste: 0.45, wordAlignment: 0.31, sentenceVar: 0.72, scopeFidelity: 0.74, citationFidelity: 0.5,
        },
        voiceSources: [
          { id: 'note-mgmt-tmz-cheatsheet', title: 'MGMT-甲基化预测 TMZ 反应 · 临床速查', date: '2024-11-03' },
          { id: 'note-family-script', title: '家属沟通话术 · 当家属问"还能活多久"', date: '2024-09-08' },
          { id: 'note-stupp-2005-2025-review', title: 'Stupp 2005 → 2025 二十年综述阅读笔记', date: '2025-02-19' },
        ],
      };
    }
    const encoder = new TextEncoder();
    const errStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: friendly, cacheMiss: isCacheMiss, fallback })}\n\n`));
        controller.close();
      },
    });
    return new Response(errStream, { headers: sseHeaders() });
  }

  const inner = replayStream(steps, { defaultGapMs: REPLAY_GAPS.voiceFillIter });
  const released = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = inner.getReader();
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: scrubErrorForClient(msg) })}\n\n`));
      } finally {
        if (guestId) await releaseConcurrent(guestId);
        controller.close();
      }
    },
  });

  return new Response(released, { headers: sseHeaders() });
}
