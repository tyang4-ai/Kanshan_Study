import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/agents/debate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/agents/debate')>();
  return {
    ...actual,
    debateStream: vi.fn(),
  };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === 'kanshan-guest-id' ? { value: 'guest-x' } : undefined,
  })),
}));

const requireRateLimitOk = vi.fn<(req: Request) => Promise<Response | null>>();
const releaseConcurrent = vi.fn<(ipHash: string) => Promise<void>>();
vi.mock('@/lib/ratelimit/check', () => ({
  requireRateLimitOk: (req: Request) => requireRateLimitOk(req),
  releaseConcurrent: (id: string) => releaseConcurrent(id),
}));

const lookupCache = vi.fn<(kind: string, intent: string) => Promise<{ response: unknown; similarity: number } | null>>();
const writeCache = vi.fn<(kind: string, intent: string, response: unknown) => Promise<void>>();
vi.mock('@/lib/cache/store', () => ({
  lookupCache: (kind: string, intent: string) => lookupCache(kind, intent),
  writeCache: (kind: string, intent: string, response: unknown) => writeCache(kind, intent, response),
}));

import { debateStream, DEBATE_FALLBACK, type DebateTurn } from '@/lib/agents/debate';
import * as routeMod from '@/app/api/agents/debate/route';

const mockedStream = vi.mocked(debateStream);

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/agents/debate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

interface SseEvent {
  event: string;
  data: unknown;
}

async function readSse(res: Response): Promise<SseEvent[]> {
  const reader = res.body?.getReader();
  if (!reader) return [];
  const decoder = new TextDecoder();
  let text = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text
    .split('\n\n')
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n');
      const event = lines[0].replace(/^event:\s*/, '');
      const data = JSON.parse(lines[1].replace(/^data:\s*/, '')) as unknown;
      return { event, data };
    });
}

function turn(i: number): DebateTurn {
  const isPro = i % 2 === 0;
  return {
    id: `t-${i}`,
    foxId: isPro ? 'wen' : 'wen2',
    mask: isPro ? '正方 · 力挺' : '反方 · 质疑',
    position: isPro ? 'pro' : 'con',
    text: `turn ${i}`,
    replyToMask: i > 0 ? (isPro ? '反方 · 质疑' : '正方 · 力挺') : undefined,
    agree: i > 0 ? false : undefined,
  };
}

function makeGen(turns: DebateTurn[]): AsyncGenerator<DebateTurn, void, void> {
  return (async function* () {
    for (const t of turns) yield t;
  })();
}

function makeThrowingGen(yieldsBefore: DebateTurn[], err: Error): AsyncGenerator<DebateTurn, void, void> {
  return (async function* () {
    for (const t of yieldsBefore) yield t;
    throw err;
  })();
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DEEPSEEK_API_KEY = 'sk-test-fallback';
  process.env.CACHE_MODE = 'auto';
  requireRateLimitOk.mockResolvedValue(null);
  releaseConcurrent.mockResolvedValue(undefined);
  lookupCache.mockResolvedValue(null);
  writeCache.mockResolvedValue(undefined);
});

describe('POST /api/agents/debate', () => {
  it('happy path: 6 turn events then done; cache miss → live called once → cache written', async () => {
    const turns = Array.from({ length: 6 }, (_, i) => turn(i));
    mockedStream.mockReturnValue(makeGen(turns));
    const res = await routeMod.POST(req({ selection: '段落', turns: 6 }));
    expect(res.headers.get('Content-Type')).toMatch(/text\/event-stream/);
    const events = await readSse(res);
    const order = events.map((e) => e.event);
    expect(order).toEqual([
      'turn',
      'turn',
      'turn',
      'turn',
      'turn',
      'turn',
      'done',
    ]);
    for (let i = 0; i < 6; i++) {
      expect((events[i].data as DebateTurn).id).toBe(`t-${i}`);
    }
    expect(mockedStream).toHaveBeenCalledTimes(1);
    expect(writeCache).toHaveBeenCalled();
  }, 30000);

  it('cache hit: live NOT called → replay emits buffered turns', async () => {
    const turns = Array.from({ length: 3 }, (_, i) => turn(i));
    lookupCache.mockResolvedValue({
      response: turns.map((t) => ({ event: 'turn', data: t })),
      similarity: 0.97,
    });
    const res = await routeMod.POST(req({ selection: '段落', turns: 6 }));
    const events = await readSse(res);
    expect(events.map((e) => e.event)).toEqual(['turn', 'turn', 'turn', 'done']);
    expect(mockedStream).not.toHaveBeenCalled();
  }, 30000);

  it('default rounds=6 when omitted', async () => {
    mockedStream.mockReturnValue(makeGen(Array.from({ length: 6 }, (_, i) => turn(i))));
    const res = await routeMod.POST(req({ selection: '段落' }));
    await readSse(res);
    expect(mockedStream).toHaveBeenCalledWith('段落', 6, expect.any(String));
  }, 30000);

  it('returns 400 on missing selection', async () => {
    const res = await routeMod.POST(req({ turns: 6 }));
    expect(res.status).toBe(400);
    expect(releaseConcurrent).toHaveBeenCalledWith('guest-x');
  });

  it('returns 400 on turns=1', async () => {
    const res = await routeMod.POST(req({ selection: '段落', turns: 1 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 on turns=11', async () => {
    const res = await routeMod.POST(req({ selection: '段落', turns: 11 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 on malformed JSON', async () => {
    const res = await routeMod.POST(req('not-json{'));
    expect(res.status).toBe(400);
  });

  it('mid-stream throw → error event with fallback then done; releaseConcurrent in finally', async () => {
    const before = [turn(0), turn(1)];
    mockedStream.mockReturnValue(
      makeThrowingGen(before, new Error('rate limit hit')),
    );
    const res = await routeMod.POST(req({ selection: '段落', turns: 6 }));
    const events = await readSse(res);
    const errEv = events.find((e) => e.event === 'error');
    expect(errEv).toBeDefined();
    const errData = errEv!.data as { message: string; fallback: DebateTurn[] };
    expect(errData.message).toMatch(/rate limit/);
    expect(errData.fallback).toEqual(DEBATE_FALLBACK);
    const last = events[events.length - 1];
    expect(last.event).toBe('done');
    expect(releaseConcurrent).toHaveBeenCalledWith('guest-x');
  });

  it('rate-limited: returns 429', async () => {
    requireRateLimitOk.mockResolvedValue(
      new Response(JSON.stringify({ error: 'rate-limit', mode: 'day' }), { status: 429 }),
    );
    const res = await routeMod.POST(req({ selection: '段落', turns: 6 }));
    expect(res.status).toBe(429);
    expect(mockedStream).not.toHaveBeenCalled();
  });

  it('BYO key: Authorization Bearer sk-... is forwarded to debateStream', async () => {
    mockedStream.mockReturnValue(makeGen([turn(0)]));
    const res = await routeMod.POST(
      req({ selection: '段落', turns: 2 }, { Authorization: 'Bearer sk-byo-d' }),
    );
    await readSse(res);
    expect(mockedStream).toHaveBeenCalledWith('段落', 2, 'sk-byo-d');
  }, 15000);

  it('in-flight dedup: two simultaneous identical-intent requests → live called once', async () => {
    let callCount = 0;
    mockedStream.mockImplementation(() => {
      callCount++;
      return (async function* () {
        await new Promise((r) => setTimeout(r, 30));
        for (let i = 0; i < 2; i++) yield turn(i);
      })();
    });
    const body = { selection: '段落-shared', turns: 2 };
    const [r1, r2] = await Promise.all([routeMod.POST(req(body)), routeMod.POST(req(body))]);
    await Promise.all([readSse(r1), readSse(r2)]);
    expect(callCount).toBe(1);
  }, 30000);
});

describe('runtime export', () => {
  it('does not export edge runtime', () => {
    expect((routeMod as unknown as { runtime?: string }).runtime).toBeUndefined();
  });
});
