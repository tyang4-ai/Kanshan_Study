import { z } from 'zod';
import { debateStream, DEBATE_FALLBACK } from '@/lib/agents/debate';

export const runtime = 'edge';

const Body = z.object({
  selection: z.string().min(1),
  turns: z.number().int().min(2).max(10).default(6),
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

export async function POST(req: Request): Promise<Response> {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(liveStream(body.selection, body.turns), sseHeaders());
}

function liveStream(selection: string, turns: number): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown): void => {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        for await (const turn of debateStream(selection, turns)) {
          send('turn', turn);
        }
        send('done', {});
      } catch (err) {
        send('error', { message: (err as Error).message, fallback: DEBATE_FALLBACK });
        send('done', {});
      } finally {
        controller.close();
      }
    },
  });
}
