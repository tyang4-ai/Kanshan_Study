import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/voice/rewriter', async () => {
  return {
    voiceFillStream: vi.fn(),
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

import { voiceFillStream } from '@/lib/voice/rewriter';
import * as routeMod from '@/app/api/agents/voice-fill/route';

const mockedStream = vi.mocked(voiceFillStream);

function req(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/agents/voice-fill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function readSse(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let out = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out;
}

const finalData = {
  generic: 'g',
  voice: 'd',
  voiceSpans: [],
  voiceScore: {
    total: 0.9,
    hardSignal: 0.9,
    llmJudge: 0.9,
    embedding: 0.9,
    termFidelity: 1,
    sub: { aiTaste: 0.9, wordAlignment: 0.9, sentenceVar: 0.9, scopeFidelity: 0.9, citationFidelity: 1 },
    rationale: 'hard 0.90 | judge 0.90 | term 1.00 | emb 0.90',
  },
  trace: [],
  voiceSources: [],
};

const iterData = {
  iter: 1,
  draft: 'd',
  voiceSpans: [],
  score: {
    total: 0.9,
    hardSignal: 0.9,
    llmJudge: 0.9,
    embedding: 0.9,
    termFidelity: 1,
    sub: { aiTaste: 0.9, wordAlignment: 0.9, sentenceVar: 0.9, scopeFidelity: 0.9, citationFidelity: 1 },
    rationale: 'hard 0.90 | judge 0.90 | term 1.00 | emb 0.90',
  },
  accepted: true,
};

async function* fakeStream() {
  yield { event: 'generic' as const, data: { text: 'g' } };
  yield { event: 'iter' as const, data: iterData };
  yield { event: 'final' as const, data: finalData };
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

describe('POST /api/agents/voice-fill', () => {
  it('happy path: cache miss → live called → SSE has generic, iter, final, no error', async () => {
    mockedStream.mockReturnValue(fakeStream());
    const res = await routeMod.POST(
      req({ bullets: 'b', selection: '', mode: 'fill' }, { 'x-kanshan-account': 'guwanxi' })
    );
    expect(res.headers.get('Content-Type')).toMatch(/text\/event-stream/);
    const body = await readSse(res);
    expect(body).toMatch(/event: generic\ndata: /);
    expect(body).toMatch(/event: iter\ndata: /);
    expect(body).toMatch(/event: final\ndata: /);
    const gIdx = body.indexOf('event: generic');
    const iIdx = body.indexOf('event: iter');
    const fIdx = body.indexOf('event: final');
    expect(gIdx).toBeLessThan(iIdx);
    expect(iIdx).toBeLessThan(fIdx);
    expect(mockedStream).toHaveBeenCalledTimes(1);
    expect(writeCache).toHaveBeenCalled();
  });

  it('cache hit: live NOT called → replay emits buffered steps', async () => {
    lookupCache.mockResolvedValue({
      response: [
        { event: 'generic', data: { text: 'cached-g' } },
        { event: 'iter', data: iterData },
        { event: 'final', data: finalData },
      ],
      similarity: 0.99,
    });
    const res = await routeMod.POST(req({ bullets: 'b', selection: '', mode: 'fill' }));
    const body = await readSse(res);
    expect(body).toMatch(/cached-g/);
    expect(mockedStream).not.toHaveBeenCalled();
  }, 15000);

  it('returns 400 on bad body', async () => {
    const res = await routeMod.POST(req({}));
    expect(res.status).toBe(400);
    expect(releaseConcurrent).toHaveBeenCalledWith('guest-x');
  });

  it('returns 400 on malformed JSON', async () => {
    const res = await routeMod.POST(req('not-json{'));
    expect(res.status).toBe(400);
    expect(releaseConcurrent).toHaveBeenCalledWith('guest-x');
  });

  it('emits event: error when live throws', async () => {
    async function* boom() {
      throw new Error('DEEPSEEK_API_KEY is not set');
      yield { event: 'generic' as const, data: { text: '' } };
    }
    mockedStream.mockReturnValue(boom());

    const res = await routeMod.POST(
      req({ bullets: 'b', selection: '', mode: 'fill' })
    );
    const body = await readSse(res);
    expect(body).toMatch(/event: error\ndata: /);
    expect(body).toMatch(/DEEPSEEK_API_KEY is not set/);
    // finally: releaseConcurrent decremented even on error path
    expect(releaseConcurrent).toHaveBeenCalledWith('guest-x');
  });

  it('rate-limited: returns the 429 Response from requireRateLimitOk', async () => {
    requireRateLimitOk.mockResolvedValue(
      new Response(JSON.stringify({ error: 'rate-limit', mode: 'hour' }), { status: 429 }),
    );
    const res = await routeMod.POST(req({ bullets: 'b', selection: '', mode: 'fill' }));
    expect(res.status).toBe(429);
    expect(mockedStream).not.toHaveBeenCalled();
  });

  it('BYO key: Authorization Bearer sk-... is forwarded to voiceFillStream', async () => {
    mockedStream.mockReturnValue(fakeStream());
    const res = await routeMod.POST(
      req({ bullets: 'b', selection: '', mode: 'fill' }, { Authorization: 'Bearer sk-byo-key-1' }),
    );
    await readSse(res);
    expect(mockedStream).toHaveBeenCalled();
    const [, , , , , apiKey] = mockedStream.mock.calls[0];
    expect(apiKey).toBe('sk-byo-key-1');
  });

  it('does not export edge runtime', () => {
    expect((routeMod as unknown as { runtime?: string }).runtime).toBeUndefined();
  });
});

describe('voice-fill in-flight dedup (via cache wrap)', () => {
  it('two simultaneous identical-intent requests → live called once', async () => {
    let callCount = 0;
    mockedStream.mockImplementation(() => {
      callCount++;
      return (async function* () {
        await new Promise((r) => setTimeout(r, 30));
        yield { event: 'generic' as const, data: { text: 'g' } };
        yield { event: 'iter' as const, data: iterData };
        yield { event: 'final' as const, data: finalData };
      })();
    });
    const body = { bullets: 'shared', selection: '', mode: 'fill' as const };
    const [r1, r2] = await Promise.all([routeMod.POST(req(body)), routeMod.POST(req(body))]);
    await Promise.all([readSse(r1), readSse(r2)]);
    expect(callCount).toBe(1);
  }, 20000);
});
