import { z } from 'zod';
import {
  runRound1,
  runRoundN,
  routeFollowup,
  runFollowup,
  PERSONA_FALLBACK,
  FOLLOWUP_FALLBACK,
  type PersonaMessage,
  type SelectedMask,
} from '@/lib/agents/persona-panel';
import { FIXED_MASKS, type MaskMeta } from '@/lib/personas';

export const runtime = 'edge';

const CustomMaskSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  fox: z.literal('wen2'),
});

const PersonaMessageSchema = z.object({
  id: z.string(),
  round: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  foxId: z.string(),
  mask: z.string(),
  text: z.string(),
  tags: z.array(z.string()),
  replyToMask: z.string().optional(),
  agree: z.union([z.boolean(), z.null()]).optional(),
  time: z.string().optional(),
});

const Body = z.object({
  selection: z.string().min(1),
  fixedIds: z.array(z.string()).optional(),
  custom: z.array(CustomMaskSchema).optional(),
  rounds: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  mode: z.enum(['rounds', 'followup']).optional(),
  history: z.array(PersonaMessageSchema).optional(),
  userMessage: z.string().optional(),
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

  const mode = body.mode ?? 'rounds';
  const selectedFixed: MaskMeta[] = body.fixedIds
    ? FIXED_MASKS.filter((m) => body.fixedIds!.includes(m.id))
    : FIXED_MASKS;
  const masks: SelectedMask[] = [...selectedFixed, ...(body.custom ?? [])];

  if (mode === 'rounds') {
    return new Response(roundsStream(body.selection, masks, body.rounds ?? 1), sseHeaders());
  }

  if (!body.userMessage || !body.history) {
    return new Response(
      JSON.stringify({ error: 'followup requires history + userMessage' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return new Response(
    followupStream(body.selection, body.history, body.userMessage, masks),
    sseHeaders()
  );
}

function roundsStream(
  selection: string,
  masks: SelectedMask[],
  rounds: 1 | 2 | 3
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown): void => {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const history: PersonaMessage[] = [];
      try {
        send('round-start', { round: 1 });
        const r1 = await runRound1(selection, masks);
        for (const m of r1) {
          history.push(m);
          send('message', m);
          await new Promise((r) => setTimeout(r, 600));
        }
        send('round-end', { round: 1 });

        if (masks.length > 1) {
          for (let r: 2 | 3 = 2; r <= rounds; r = (r + 1) as 2 | 3) {
            send('round-start', { round: r });
            const rN = await runRoundN(selection, masks, history, r);
            for (const m of rN) {
              history.push(m);
              send('message', m);
              await new Promise((r) => setTimeout(r, 600));
            }
            send('round-end', { round: r });
            if (r === rounds) break;
          }
        }
        send('done', {});
      } catch (err) {
        send('error', { message: (err as Error).message, fallback: PERSONA_FALLBACK });
        send('done', {});
      } finally {
        controller.close();
      }
    },
  });
}

function followupStream(
  selection: string,
  history: PersonaMessage[],
  userMessage: string,
  masks: SelectedMask[]
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown): void => {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        let chosenMask: SelectedMask;
        if (masks.length === 1) {
          chosenMask = masks[0];
          send('routing', { chosenMaskLabel: masks[0].label, why: '仅一位读者在场' });
        } else {
          const routed = await routeFollowup(history, userMessage, masks);
          chosenMask = routed.mask;
          send('routing', { chosenMaskLabel: routed.mask.label, why: routed.why });
        }
        const msg = await runFollowup(selection, history, userMessage, chosenMask);
        send('message', msg);
        send('done', {});
      } catch (err) {
        const fallbackMask = masks[0] ?? FIXED_MASKS[0];
        send('error', {
          message: (err as Error).message,
          fallback: [FOLLOWUP_FALLBACK(userMessage, fallbackMask)],
        });
        send('done', {});
      } finally {
        controller.close();
      }
    },
  });
}
