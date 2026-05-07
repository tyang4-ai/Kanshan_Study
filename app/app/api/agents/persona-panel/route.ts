import { z } from 'zod';
import { cookies } from 'next/headers';
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
import { withCache } from '@/lib/cache/wrap';
import { replayStream, REPLAY_GAPS, type ReplayStep } from '@/lib/cache/replay';
import { personaRoundKey, personaFollowupKey } from '@/lib/cache/keys';
import { proxyAuth } from '@/lib/apikey/proxy';
import type { Provider } from '@/lib/llm';
import { requireRateLimitOk, releaseConcurrent } from '@/lib/ratelimit/check';

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

  const mode = body.mode ?? 'rounds';
  const selectedFixed: MaskMeta[] = body.fixedIds
    ? FIXED_MASKS.filter((m) => body.fixedIds!.includes(m.id))
    : FIXED_MASKS;
  const masks: SelectedMask[] = [...selectedFixed, ...(body.custom ?? [])];
  const creds = proxyAuth(req);

  if (mode === 'rounds') {
    const rounds = body.rounds ?? 1;
    const inner = await roundsStream(body.selection, masks, rounds, creds.key, creds.provider);
    return new Response(wrapRelease(inner, guestId), sseHeaders());
  }

  if (!body.userMessage || !body.history) {
    if (guestId) await releaseConcurrent(guestId);
    return new Response(
      JSON.stringify({ error: 'followup requires history + userMessage' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const inner = await followupStream(body.selection, body.history, body.userMessage, masks, creds.key, creds.provider);
  return new Response(wrapRelease(inner, guestId), sseHeaders());
}

async function roundsStream(
  selection: string,
  masks: SelectedMask[],
  rounds: 1 | 2 | 3,
  apiKey: string,
  provider: Provider,
): Promise<ReadableStream<Uint8Array>> {
  const intent = personaRoundKey({
    paragraph: selection,
    maskIds: masks.map((m) => m.id),
    round: rounds,
  });

  let steps: ReplayStep[];
  try {
    steps = await withCache<ReplayStep[]>('persona-panel', intent, async () => {
      const buffered: ReplayStep[] = [];
      const history: PersonaMessage[] = [];
      buffered.push({ event: 'round-start', data: { round: 1 } });
      const r1 = await runRound1(selection, masks, apiKey, provider);
      for (const m of r1) {
        history.push(m);
        buffered.push({ event: 'message', data: m });
      }
      buffered.push({ event: 'round-end', data: { round: 1 } });

      if (masks.length > 1) {
        for (let r: 2 | 3 = 2; r <= rounds; r = (r + 1) as 2 | 3) {
          buffered.push({ event: 'round-start', data: { round: r } });
          const rN = await runRoundN(selection, masks, history, r, apiKey, provider);
          for (const m of rN) {
            history.push(m);
            buffered.push({ event: 'message', data: m });
          }
          buffered.push({ event: 'round-end', data: { round: r } });
          if (r === rounds) break;
        }
      }
      return buffered;
    });
  } catch (err) {
    return errorStream((err as Error).message, { fallback: PERSONA_FALLBACK });
  }

  return replayStream(steps, {
    defaultGapMs: REPLAY_GAPS.personaMessage,
    finalEvent: 'done',
    finalData: {},
  });
}

async function followupStream(
  selection: string,
  history: PersonaMessage[],
  userMessage: string,
  masks: SelectedMask[],
  apiKey: string,
  provider: Provider,
): Promise<ReadableStream<Uint8Array>> {
  const intent = personaFollowupKey({
    paragraph: selection,
    history: history.map((h) => ({ mask: h.mask, text: h.text })),
    userMessage,
    routedMask: masks.length === 1 ? masks[0].label : 'auto',
  });

  let steps: ReplayStep[];
  try {
    steps = await withCache<ReplayStep[]>('persona-followup', intent, async () => {
      const buffered: ReplayStep[] = [];
      let chosenMask: SelectedMask;
      if (masks.length === 1) {
        chosenMask = masks[0];
        buffered.push({
          event: 'routing',
          data: { chosenMaskLabel: masks[0].label, why: '仅一位读者在场' },
        });
      } else {
        const routed = await routeFollowup(history, userMessage, masks, apiKey, provider);
        chosenMask = routed.mask;
        buffered.push({
          event: 'routing',
          data: { chosenMaskLabel: routed.mask.label, why: routed.why },
        });
      }
      const msg = await runFollowup(selection, history, userMessage, chosenMask, apiKey, provider);
      buffered.push({ event: 'message', data: msg });
      return buffered;
    });
  } catch (err) {
    const fallbackMask = masks[0] ?? FIXED_MASKS[0];
    return errorStream((err as Error).message, {
      fallback: [FOLLOWUP_FALLBACK(userMessage, fallbackMask)],
    });
  }

  return replayStream(steps, {
    defaultGapMs: REPLAY_GAPS.personaMessage,
    finalEvent: 'done',
    finalData: {},
  });
}

function errorStream(message: string, payload: Record<string, unknown>): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(
        enc.encode(`event: error\ndata: ${JSON.stringify({ message, ...payload })}\n\n`),
      );
      controller.enqueue(enc.encode(`event: done\ndata: {}\n\n`));
      controller.close();
    },
  });
}
