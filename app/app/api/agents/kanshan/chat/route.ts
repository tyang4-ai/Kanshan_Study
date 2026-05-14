import { z } from 'zod';
import { cookies } from 'next/headers';
import {
  runKanshanTurn,
  KANSHAN_FALLBACK,
  type KanshanChatTurn,
} from '@/lib/agents/kanshan-router';
import { withCache, CacheMissError } from '@/lib/cache/wrap';
import { replayStream, REPLAY_GAPS, type ReplayStep } from '@/lib/cache/replay';
import { proxyAuth } from '@/lib/apikey/proxy';
import { requireRateLimitOk, releaseConcurrent } from '@/lib/ratelimit/check';
import { scrubErrorForClient } from '@/lib/errors/scrub';

const TurnSchema = z.object({
  role: z.enum(['user', 'kanshan']),
  content: z.string(),
});

const Body = z.object({
  history: z.array(TurnSchema).default([]),
  userMessage: z.string().min(1).max(2000),
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
  const c = await cookies();
  return c.get('kanshan-guest-id')?.value ?? null;
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

function intentKey(history: KanshanChatTurn[], userMessage: string): string {
  const parts = history.map((t) => `${t.role}:${t.content}`);
  parts.push(`user:${userMessage}`);
  return parts.join('||');
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

  // R7 production review (Jiang Hanzhi) P1: pull proxyAuth into the try so a
  // missing-key throw becomes an SSE error + release, not an uncaught 500.
  let steps: ReplayStep[];
  try {
    const creds = proxyAuth(req);
    const cacheMode = creds.source === 'gated' ? ('cache-only' as const) : undefined;
    const intent = intentKey(body.history, body.userMessage);
    // Bypass withCache for chat: it was dropping verified hits on the floor
    // in production (lookupCache returns sim=1 but withCache fell through
    // to a live-timeout CacheMissError). Direct lookup + manual live fallback.
    const { lookupCache, writeCache } = await import('@/lib/cache/store');
    const directHit = await lookupCache<ReplayStep[]>('kanshan-chat', intent);
    if (directHit) {
      steps = directHit.response;
    } else if (cacheMode === 'cache-only') {
      throw new CacheMissError('kanshan-chat', intent);
    } else {
      const reply = await Promise.race([
        runKanshanTurn(body.history, body.userMessage, creds.key, creds.provider),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new CacheMissError('kanshan-chat', intent + ' (timeout)')), 2500),
        ),
      ]);
      const buffered: ReplayStep[] = [{ event: 'reply', data: { text: reply.reply } }];
      if (reply.toolCall) buffered.push({ event: 'tool_call', data: reply.toolCall });
      steps = buffered;
      Promise.resolve(writeCache('kanshan-chat', intent, buffered)).catch(() => {});
    }
  } catch (err) {
    const friendly = err instanceof CacheMissError
      ? '当前为缓存演示模式 · 该对话未在预生成缓存中。请按编辑器内的引导文档操作，或到设置 → 实时模式开启自带密钥模式。'
      : scrubErrorForClient((err as Error).message);
    const inner = errorStream(friendly);
    return new Response(wrapRelease(inner, guestId), sseHeaders());
  }

  const inner = replayStream(steps, {
    defaultGapMs: REPLAY_GAPS.personaMessage,
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
          `event: reply\ndata: ${JSON.stringify({ text: KANSHAN_FALLBACK.reply, error: message })}\n\n`,
        ),
      );
      controller.enqueue(enc.encode(`event: done\ndata: {}\n\n`));
      controller.close();
    },
  });
}
