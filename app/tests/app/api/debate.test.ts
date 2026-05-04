import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/agents/debate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/agents/debate')>();
  return {
    ...actual,
    debateStream: vi.fn(),
  };
});

import { debateStream, DEBATE_FALLBACK, type DebateTurn } from '@/lib/agents/debate';
import * as routeMod from '@/app/api/agents/debate/route';

const mockedStream = vi.mocked(debateStream);

function req(body: unknown): Request {
  return new Request('http://localhost/api/agents/debate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
});

describe('POST /api/agents/debate', () => {
  it('happy path: 6 turn events then done', async () => {
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
  });

  it('default rounds=6 when omitted', async () => {
    mockedStream.mockReturnValue(makeGen(Array.from({ length: 6 }, (_, i) => turn(i))));
    await routeMod.POST(req({ selection: '段落' }));
    expect(mockedStream).toHaveBeenCalledWith('段落', 6);
  });

  it('returns 400 on missing selection', async () => {
    const res = await routeMod.POST(req({ turns: 6 }));
    expect(res.status).toBe(400);
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

  it('mid-stream throw → error event with fallback then done', async () => {
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
  });
});

describe('runtime export', () => {
  it('runtime === "edge"', () => {
    expect(routeMod.runtime).toBe('edge');
  });
});
