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

function req(body: unknown): Request {
  return new Request('http://localhost/api/agents/persona-panel', {
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

function msg(round: 1 | 2 | 3, mask: string): PersonaMessage {
  return { id: `${mask}-${round}`, round, foxId: 'wen', mask, text: 't', tags: [] };
}

beforeEach(() => {
  vi.clearAllMocks();
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
  });

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
  });

  it('single mask: only round 1 fires regardless of rounds=2', async () => {
    mockedR1.mockResolvedValue([msg(1, '路人读者')]);
    const res = await routeMod.POST(
      req({ selection: '段落', fixedIds: ['passerby'], rounds: 2 })
    );
    const events = await readSse(res);
    const startEvents = events.filter((e) => e.event === 'round-start');
    expect(startEvents).toHaveLength(1);
    expect(mockedRN).not.toHaveBeenCalled();
  });

  it('mid-stream throw → error event with fallback + done event', async () => {
    mockedR1.mockRejectedValue(new Error('DEEPSEEK_API_KEY is not set'));
    const res = await routeMod.POST(
      req({ selection: '段落', fixedIds: ['passerby', 'expert'], rounds: 1 })
    );
    const events = await readSse(res);
    const errEv = events.find((e) => e.event === 'error');
    expect(errEv).toBeDefined();
    const errData = errEv!.data as { message: string; fallback: PersonaMessage[] };
    expect(errData.message).toMatch(/DEEPSEEK_API_KEY/);
    expect(Array.isArray(errData.fallback)).toBe(true);
    expect(errData.fallback.length).toBeGreaterThan(0);
    const last = events[events.length - 1];
    expect(last.event).toBe('done');
  });
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
  });

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
  });
});

describe('POST /api/agents/persona-panel — validation', () => {
  it('returns 400 on missing selection', async () => {
    const res = await routeMod.POST(req({ fixedIds: ['passerby'] }));
    expect(res.status).toBe(400);
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
  it('runtime === "edge"', () => {
    expect(routeMod.runtime).toBe('edge');
  });
});
