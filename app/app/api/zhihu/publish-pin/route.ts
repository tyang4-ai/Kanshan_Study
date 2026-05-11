// S7-B2 (2026-05-11): publishPin write surface. The pitch claimed "知乎 OpenAPI
// integration" but no button surfaced it during demo — judges only saw the
// header badge. This route fronts publishPin so a real client button can call
// it. publishPin already gates on MODE; in mock mode it returns the fixture
// response (perfect for the demo screen-share — no real post lands on 知乎).
import { publishPin, DEFAULT_RING_ID, SUPPORTED_RING_IDS } from '@/lib/zhihu';
import { scrubErrorForClient } from '@/lib/errors/scrub';

type SupportedRingId = (typeof SUPPORTED_RING_IDS)[number]['id'];

interface PublishBody {
  content?: unknown;
  ringId?: unknown;
}

const VALID_RING_IDS: ReadonlySet<string> = new Set(SUPPORTED_RING_IDS.map((r) => r.id));

export async function POST(req: Request): Promise<Response> {
  let body: PublishBody;
  try {
    body = (await req.json()) as PublishBody;
  } catch {
    return new Response(JSON.stringify({ error: 'malformed JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) {
    return new Response(JSON.stringify({ error: 'content required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (content.length > 4000) {
    return new Response(JSON.stringify({ error: 'content too long (>4000)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const requestedRing = typeof body.ringId === 'string' ? body.ringId : DEFAULT_RING_ID;
  const ringId: SupportedRingId = VALID_RING_IDS.has(requestedRing)
    ? (requestedRing as SupportedRingId)
    : DEFAULT_RING_ID;

  try {
    const result = await publishPin(content, ringId);
    return new Response(JSON.stringify({ ok: true, result, ringId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: scrubErrorForClient(message) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
