import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/voice/rewriter', async () => {
  return {
    voiceFillStream: vi.fn(),
  };
});
vi.mock('@/lib/cache/store', () => ({
  lookupCache: vi.fn().mockResolvedValue(null),
  writeCache: vi.fn().mockResolvedValue(undefined),
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

async function* fakeStream() {
  yield { event: 'generic' as const, data: { text: 'g' } };
  yield {
    event: 'iter' as const,
    data: {
      iter: 1,
      draft: 'd',
      voiceSpans: [],
      score: {
        total: 0.9,
        hardSignal: 0.9,
        llmJudge: 0.9,
        embedding: 0.9,
        sub: { aiTaste: 0.9, wordAlignment: 0.9, sentenceVar: 0.9 },
        rationale: 'hard 0.90 | judge 0.90 | emb 0.90',
      },
      accepted: true,
    },
  };
  yield {
    event: 'final' as const,
    data: {
      generic: 'g',
      voice: 'd',
      voiceSpans: [],
      voiceScore: {
        total: 0.9,
        hardSignal: 0.9,
        llmJudge: 0.9,
        embedding: 0.9,
        sub: { aiTaste: 0.9, wordAlignment: 0.9, sentenceVar: 0.9 },
        rationale: 'hard 0.90 | judge 0.90 | emb 0.90',
      },
      trace: [],
      voiceSources: [],
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/agents/voice-fill', () => {
  it('happy path: SSE body contains generic, iter, final events in order', async () => {
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
  });

  it('returns 400 on bad body', async () => {
    const res = await routeMod.POST(req({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 on malformed JSON', async () => {
    const res = await routeMod.POST(req('not-json{'));
    expect(res.status).toBe(400);
  });

  it('emits event: error when stream throws', async () => {
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
  });

  it('exports edge runtime', () => {
    expect(routeMod.runtime).toBe('edge');
  });
});
