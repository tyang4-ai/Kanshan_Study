import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/llm/deepseek', () => ({
  chat: vi.fn(),
}));

import { chat } from '@/lib/llm/deepseek';
import {
  debateStream,
  DEBATE_FALLBACK,
  type DebateTurn,
} from '@/lib/agents/debate';

const mockedChat = vi.mocked(chat);

beforeEach(() => {
  vi.clearAllMocks();
});

async function collect(gen: AsyncGenerator<DebateTurn, void, void>): Promise<DebateTurn[]> {
  const out: DebateTurn[] = [];
  for await (const t of gen) out.push(t);
  return out;
}

describe('debateStream', () => {
  it('default 6 turns alternate wen/wen2 with correct positions', async () => {
    let n = 0;
    mockedChat.mockImplementation(async () => `turn-${n++}`);
    const turns = await collect(debateStream('段落'));
    expect(turns).toHaveLength(6);
    for (let i = 0; i < turns.length; i++) {
      const expectedFox = i % 2 === 0 ? 'wen' : 'wen2';
      const expectedPos = i % 2 === 0 ? 'pro' : 'con';
      expect(turns[i].foxId).toBe(expectedFox);
      expect(turns[i].position).toBe(expectedPos);
      expect(turns[i].mask).toBe(i % 2 === 0 ? '正方 · 力挺' : '反方 · 质疑');
      expect(turns[i].text).toBe(`turn-${i}`);
    }
  });

  it('turn 0 has no replyToMask and agree undefined', async () => {
    mockedChat.mockResolvedValue('hello');
    const turns = await collect(debateStream('段落', 2));
    expect(turns[0].replyToMask).toBeUndefined();
    expect(turns[0].agree).toBeUndefined();
  });

  it('turns 1+ have replyToMask = opponent mask and agree=false', async () => {
    mockedChat.mockResolvedValue('hello');
    const turns = await collect(debateStream('段落', 4));
    expect(turns[1].replyToMask).toBe('正方 · 力挺');
    expect(turns[1].agree).toBe(false);
    expect(turns[2].replyToMask).toBe('反方 · 质疑');
    expect(turns[2].agree).toBe(false);
    expect(turns[3].replyToMask).toBe('正方 · 力挺');
    expect(turns[3].agree).toBe(false);
  });

  it('turns=2 yields exactly 2', async () => {
    mockedChat.mockResolvedValue('hello');
    const turns = await collect(debateStream('段落', 2));
    expect(turns).toHaveLength(2);
  });

  it('chat throws → generator propagates throw', async () => {
    mockedChat.mockRejectedValue(new Error('DEEPSEEK_API_KEY is not set'));
    await expect(collect(debateStream('段落', 6))).rejects.toThrow(/DEEPSEEK_API_KEY/);
  });

  it('each turn has a unique id', async () => {
    let n = 0;
    mockedChat.mockImplementation(async () => `t-${n++}`);
    const turns = await collect(debateStream('段落', 6));
    const ids = new Set(turns.map((t) => t.id));
    expect(ids.size).toBe(6);
  });
});

describe('DEBATE_FALLBACK', () => {
  it('has 2 entries with alternating positions', () => {
    expect(DEBATE_FALLBACK).toHaveLength(2);
    expect(DEBATE_FALLBACK[0].position).toBe('pro');
    expect(DEBATE_FALLBACK[0].foxId).toBe('wen');
    expect(DEBATE_FALLBACK[1].position).toBe('con');
    expect(DEBATE_FALLBACK[1].foxId).toBe('wen2');
  });

  it('second entry has replyToMask = first.mask and agree=false', () => {
    expect(DEBATE_FALLBACK[1].replyToMask).toBe(DEBATE_FALLBACK[0].mask);
    expect(DEBATE_FALLBACK[1].agree).toBe(false);
  });

  it('first entry has no replyToMask', () => {
    expect(DEBATE_FALLBACK[0].replyToMask).toBeUndefined();
  });
});
