import { z } from 'zod';
import { getCurrentUser } from '@/lib/account';
import { loadBaseline } from '@/lib/voice/baseline';
import { voiceFillStream, type VoiceFillEvent } from '@/lib/voice/rewriter';
import { lookupCache, writeCache } from '@/lib/cache/store';

export const runtime = 'edge';

const BodySchema = z.object({
  bullets: z.string(),
  selection: z.string(),
  mode: z.enum(['fill', 'polish']),
});

function sseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  };
}

function encodeEvent(ev: VoiceFillEvent): string {
  return `event: ${ev.event}\ndata: ${JSON.stringify(ev.data)}\n\n`;
}

function encodeError(message: string): string {
  return `event: error\ndata: ${JSON.stringify({ message })}\n\n`;
}

export async function POST(req: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const { bullets, selection, mode } = parsed.data;
  const user = getCurrentUser(req);
  const baseline = loadBaseline(user.id);

  // TODO plan #13: real cache layer (Supabase table or KV namespace)
  await lookupCache<VoiceFillEvent[]>('voice-fill', `${user.id}:${mode}:${bullets}:${selection}`);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of voiceFillStream(user.id, bullets, mode, selection, baseline)) {
          controller.enqueue(encoder.encode(encodeEvent(ev)));
        }
        await writeCache<unknown>('voice-fill', `${user.id}:${mode}:${bullets}:${selection}`, null);
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(encodeError(msg)));
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}
