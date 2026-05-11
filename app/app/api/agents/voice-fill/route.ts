import { z } from 'zod';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/account';
import { loadBaseline } from '@/lib/voice/baseline';
import { voiceFillStream } from '@/lib/voice/rewriter';
import { withCache } from '@/lib/cache/wrap';
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
    const intent = voiceFillKey({ userId: user.id, mode, bullets, selection });
    steps = await withCache<ReplayStep[]>('voice-fill', intent, async () => {
      const buffered: ReplayStep[] = [];
      for await (const ev of voiceFillStream(user.id, bullets, mode, selection, baseline, creds.key, creds.provider)) {
        buffered.push({ event: ev.event, data: ev.data });
      }
      return buffered;
    });
  } catch (err) {
    if (guestId) await releaseConcurrent(guestId);
    const msg = err instanceof Error ? err.message : String(err);
    const encoder = new TextEncoder();
    const errStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: scrubErrorForClient(msg) })}\n\n`));
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
