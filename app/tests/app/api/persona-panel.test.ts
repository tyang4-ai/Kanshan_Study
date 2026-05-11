import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/agents/persona-panel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/agents/persona-panel')>();
  return {
    ...actual,
    runRound1: vi.fn(),
    runRoundN: vi.fn(),
    routeFollowup: vi.fn(),
    runFollowup: vi.fn(),
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

import {
  runRound1,
  runRoundN,
  routeFollowup,
  runFollowup,
  type PersonaMessage,
} from '@/lib/agents/persona-panel';
import * as routeMod from '@/app/api/agents/persona-panel/route';

const mockedR1 = vi.mocked(runRound1);
const mockedRN = vi.mocked(runRoundN);
const mockedRoute = vi.mocked(routeFollowup);
const mockedFollow = vi.mocked(runFollowup);

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/agents/persona-panel', {
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

function msg(round: 1 | 2 | 3, mask: string): PersonaMessage {
  return { id: `${mask}-${round}`, round, foxId: 'wen', mask, text: 't', tags: [] };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.KIMI_API_KEY = 'sk-kimi-test-fallback';
  process.env.DEEPSEEK_API_KEY = 'sk-test-fallback';
  process.env.CACHE_MODE = 'auto';
  requireRateLimitOk.mockResolvedValue(null);
  releaseConcurrent.mockResolvedValue(undefined);
  lookupCache.mockResolvedValue(null);
  writeCache.mockResolvedValue(undefined);
});

describe('POST /api/agents/persona-panel — rounds mode', () => {
  it('happy path: round-start → message×N → round-end → done for rounds=1 with 2 masks', async () => {
    mockedR1.mockResolvedValue([msg(1, '路人读者'), msg(1, '业内行家')]);
    const res = await routeMod.POST(
      req({ selection: '段落', fixedIds: ['passerby', 'expert'], rounds: 1 })
    );
    expect(res.headers.get('Content-Type')).toMatch(/text\/event-stream/);
    const events = await readSse(res);
    const order = events.map((e) => e.event);
    expect(order).toEqual([
      'round-start',
      'message',
      'message',
      'round-end',
      'done',
    ]);
    expect(writeCache).toHaveBeenCalled();
  }, 15000);

  it('rounds=2 with 2 masks emits 2 round-start blocks', async () => {
    mockedR1.mockResolvedValue([msg(1, '路人读者'), msg(1, '业内行家')]);
    mockedRN.mockResolvedValue([msg(2, '路人读者')]);
    const res = await routeMod.POST(
      req({ selection: '段落', fixedIds: ['passerby', 'expert'], rounds: 2 })
    );
    const events = await readSse(res);
    const startEvents = events.filter((e) => e.event === 'round-start');
    expect(startEvents).toHaveLength(2);
    expect((startEvents[0].data as { round: number }).round).toBe(1);
    expect((startEvents[1].data as { round: number }).round).toBe(2);
  }, 15000);

  it('single mask: only round 1 fires regardless of rounds=2', async () => {
    mockedR1.mockResolvedValue([msg(1, '路人读者')]);
    const res = await routeMod.POST(
      req({ selection: '段落', fixedIds: ['passerby'], rounds: 2 })
    );
    const events = await readSse(res);
    const startEvents = events.filter((e) => e.event === 'round-start');
    expect(startEvents).toHaveLength(1);
    expect(mockedRN).not.toHaveBeenCalled();
  }, 15000);

  it('cache hit: live NOT called, replay emits buffered events', async () => {
    lookupCache.mockResolvedValue({
      response: [
        { event: 'round-start', data: { round: 1 } },
        { event: 'message', data: msg(1, '路人读者') },
        { event: 'round-end', data: { round: 1 } },
      ],
      similarity: 0.95,
    });
    const res = await routeMod.POST(
      req({ selection: '段落', fixedIds: ['passerby'], rounds: 1 })
    );
    const events = await readSse(res);
    expect(events.map((e) => e.event)).toEqual(['round-start', 'message', 'round-end', 'done']);
    expect(mockedR1).not.toHaveBeenCalled();
  }, 15000);

  it('mid-stream throw → error event with fallback + done event', async () => {
    mockedR1.mockRejectedValue(new Error('DEEPSEEK_API_KEY is not set'));
    const res = await routeMod.POST(
      req({ selection: '段落', fixedIds: ['passerby', 'expert'], rounds: 1 })
    );
    const events = await readSse(res);
    const errEv = events.find((e) => e.event === 'error');
    expect(errEv).toBeDefined();
    const errData = errEv!.data as { message: string; fallback: PersonaMessage[] };
    // R4 security (Cao Renxin): SSE error bodies are scrubbed of API-key
    // references — "DEEPSEEK_API_KEY is not set" must NOT round-trip.
    expect(errData.message).not.toMatch(/DEEPSEEK_API_KEY/);
    expect(errData.message).toBe('上游服务暂不可用');
    expect(Array.isArray(errData.fallback)).toBe(true);
    expect(errData.fallback.length).toBeGreaterThan(0);
    const last = events[events.length - 1];
    expect(last.event).toBe('done');
    expect(releaseConcurrent).toHaveBeenCalledWith('guest-x');
  });

  it('rate-limited: returns 429', async () => {
    requireRateLimitOk.mockResolvedValue(
      new Response(JSON.stringify({ error: 'rate-limit', mode: 'concurrent' }), { status: 429 }),
    );
    const res = await routeMod.POST(req({ selection: '段落', fixedIds: ['passerby'] }));
    expect(res.status).toBe(429);
    expect(mockedR1).not.toHaveBeenCalled();
  });

  it('BYO key: Authorization Bearer sk-... is forwarded to runRound1', async () => {
    mockedR1.mockResolvedValue([msg(1, '路人读者')]);
    const res = await routeMod.POST(
      req({ selection: '段落', fixedIds: ['passerby'], rounds: 1 }, { Authorization: 'Bearer sk-byo-1' }),
    );
    await readSse(res);
    expect(mockedR1).toHaveBeenCalledWith('段落', expect.any(Array), 'sk-byo-1', 'kimi');
  }, 15000);
});

describe('POST /api/agents/persona-panel — followup mode', () => {
  it('happy path: routing → message → done', async () => {
    mockedRoute.mockResolvedValue({
      mask: { id: 'expert', label: '业内行家', hint: '', fox: 'wen' },
      why: '这是技术问题',
    });
    mockedFollow.mockResolvedValue({
      ...msg(1, '业内行家'),
      replyToMask: '你',
    });
    const history = [msg(1, '路人读者')];
    const res = await routeMod.POST(
      req({
        selection: '段落',
        fixedIds: ['passerby', 'expert'],
        mode: 'followup',
        history,
        userMessage: '术语怎么改？',
      })
    );
    const events = await readSse(res);
    const order = events.map((e) => e.event);
    expect(order).toEqual(['routing', 'message', 'done']);
    expect((events[0].data as { chosenMaskLabel: string }).chosenMaskLabel).toBe(
      '业内行家'
    );
  }, 15000);

  it('single mask: routing event fires with why="仅一位读者在场" then message', async () => {
    mockedFollow.mockResolvedValue({
      ...msg(1, '路人读者'),
      replyToMask: '你',
    });
    const history = [msg(1, '路人读者')];
    const res = await routeMod.POST(
      req({
        selection: '段落',
        fixedIds: ['passerby'],
        mode: 'followup',
        history,
        userMessage: '?',
      })
    );
    const events = await readSse(res);
    expect(events[0].event).toBe('routing');
    const r = events[0].data as { chosenMaskLabel: string; why: string };
    expect(r.why).toBe('仅一位读者在场');
    expect(r.chosenMaskLabel).toBe('路人读者');
    expect(events[1].event).toBe('message');
    expect(mockedRoute).not.toHaveBeenCalled();
  }, 15000);
});

describe('POST /api/agents/persona-panel — validation', () => {
  it('returns 400 on missing selection', async () => {
    const res = await routeMod.POST(req({ fixedIds: ['passerby'] }));
    expect(res.status).toBe(400);
    expect(releaseConcurrent).toHaveBeenCalledWith('guest-x');
  });

  it('returns 400 on rounds=4', async () => {
    const res = await routeMod.POST(
      req({ selection: '段落', fixedIds: ['passerby'], rounds: 4 })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 on followup mode missing userMessage', async () => {
    const res = await routeMod.POST(
      req({
        selection: '段落',
        fixedIds: ['passerby'],
        mode: 'followup',
        history: [],
      })
    );
    expect(res.status).toBe(400);
    expect(releaseConcurrent).toHaveBeenCalledWith('guest-x');
  });

  it('returns 400 on followup mode missing history', async () => {
    const res = await routeMod.POST(
      req({
        selection: '段落',
        fixedIds: ['passerby'],
        mode: 'followup',
        userMessage: '?',
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 on malformed JSON', async () => {
    const res = await routeMod.POST(req('not-json{'));
    expect(res.status).toBe(400);
  });
});

describe('runtime export', () => {
  it('does not export edge runtime', () => {
    expect((routeMod as unknown as { runtime?: string }).runtime).toBeUndefined();
  });
});
