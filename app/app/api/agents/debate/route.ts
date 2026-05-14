import { z } from 'zod';
import { cookies } from 'next/headers';
import { debateStream, DEBATE_FALLBACK } from '@/lib/agents/debate';
import { withCache, CacheMissError } from '@/lib/cache/wrap';
import { replayStream, REPLAY_GAPS, type ReplayStep } from '@/lib/cache/replay';
import { debateKey } from '@/lib/cache/keys';
import { proxyAuth } from '@/lib/apikey/proxy';
import { requireRateLimitOk, releaseConcurrent } from '@/lib/ratelimit/check';
import { scrubErrorForClient } from '@/lib/errors/scrub';

const RoleSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    description: z.string().optional(),
  })
  .optional();

const Body = z.object({
  selection: z.string().min(1).max(4000),
  turns: z.number().int().min(2).max(10).default(6),
  proRole: RoleSchema,
  conRole: RoleSchema,
});

function sseHeaders(): ResponseInit {
  return {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  };
}

async function getGuestId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('kanshan-guest-id')?.value ?? null;
}

function wrapRelease(
  inner: ReadableStream<Uint8Array>,
  guestId: string | null,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = inner.getReader();
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } finally {
        if (guestId) await releaseConcurrent(guestId);
        controller.close();
      }
    },
  });
}

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

  // R7 production review (Jiang Hanzhi) P1: pull proxyAuth + key gen into the
  // try block so a missing-key throw becomes an SSE error event + concurrent
  // release, not an uncaught 500 + counter leak.
  let steps: ReplayStep[];
  try {
    const creds = proxyAuth(req);
    const cacheMode = creds.source === 'gated' ? ('cache-only' as const) : undefined;
    const intent = debateKey({ selection: body.selection, turns: body.turns });
    steps = await withCache<ReplayStep[]>('persona-debate', intent, async () => {
      const buffered: ReplayStep[] = [];
      for await (const turn of debateStream(
        body.selection,
        body.turns,
        creds.key,
        creds.provider,
        body.proRole,
        body.conRole,
      )) {
        buffered.push({ event: 'turn', data: turn });
      }
      return buffered;
    }, { mode: cacheMode, liveTimeoutMs: 2500 });
  } catch (err) {
    const friendly = err instanceof CacheMissError
      ? '当前为缓存演示模式 · 该辩论未在预生成缓存中。请按编辑器内的引导文档操作，或到设置 → 实时模式开启自带密钥模式。'
      : scrubErrorForClient((err as Error).message);
    const inner = errorStream(friendly);
    return new Response(wrapRelease(inner, guestId), sseHeaders());
  }

  const inner = replayStream(steps, {
    defaultGapMs: REPLAY_GAPS.debateTurn,
    finalEvent: 'done',
    finalData: {},
  });
  return new Response(wrapRelease(inner, guestId), sseHeaders());
}

function errorStream(message: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(
        enc.encode(
          `event: error\ndata: ${JSON.stringify({ message, fallback: DEBATE_FALLBACK })}\n\n`,
        ),
      );
      controller.enqueue(enc.encode(`event: done\ndata: {}\n\n`));
      controller.close();
    },
  });
}
