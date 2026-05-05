import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the live LLM agents — we only assert that the seed modules call
// writeCache the right number of times with canonicalized keys.
vi.mock('@/lib/cache/store', () => ({
  writeCache: vi.fn(),
}));

vi.mock('@/lib/agents/persona-panel', () => ({
  runRound1: vi.fn(),
  runRoundN: vi.fn(),
  runFollowup: vi.fn(),
}));

vi.mock('@/lib/agents/debate', async () => ({
  debateStream: vi.fn(),
}));

vi.mock('@/lib/voice/rewriter', () => ({
  voiceFillStream: vi.fn(),
}));

vi.mock('@/lib/voice/baseline', () => ({
  loadBaseline: vi.fn(() => ({})),
}));

import { writeCache } from '@/lib/cache/store';
import { runRound1, runRoundN, runFollowup } from '@/lib/agents/persona-panel';
import { debateStream } from '@/lib/agents/debate';
import { voiceFillStream } from '@/lib/voice/rewriter';
import { seedPersona } from '@/scripts/seed/persona';
import { seedDebate } from '@/scripts/seed/debate';
import { seedVoice } from '@/scripts/seed/voice';

const mockedWrite = vi.mocked(writeCache);
const mockedR1 = vi.mocked(runRound1);
const mockedRN = vi.mocked(runRoundN);
const mockedFu = vi.mocked(runFollowup);
const mockedDebate = vi.mocked(debateStream);
const mockedVoice = vi.mocked(voiceFillStream);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('seedPersona', () => {
  it('writes 5 entries per fixed-mask paragraph + 3 entries for custom mask = 13 total', async () => {
    mockedR1.mockResolvedValue([
      { id: 'a', round: 1, foxId: 'wen', mask: '路人读者', text: 't', tags: [] },
    ]);
    mockedRN.mockResolvedValue([
      { id: 'b', round: 2, foxId: 'wen', mask: '业内行家', text: 't2', tags: [] },
    ]);
    mockedFu.mockResolvedValue({
      id: 'c', round: 1, foxId: 'wen', mask: '业内行家', text: 'fu', tags: [], replyToMask: '你',
    });

    const count = await seedPersona();
    // 2 paragraphs × (R1 + R2 + R3 + 2 followups) = 10 fixed-mask entries
    // + custom mask: R1 + 2 followups = 3
    // Total = 13
    expect(count).toBe(13);
    expect(mockedWrite).toHaveBeenCalledTimes(13);

    // Spot-check the kinds written
    const kinds = mockedWrite.mock.calls.map((c) => c[0]);
    expect(kinds.filter((k) => k === 'persona-panel').length).toBe(6); // 3 rounds × 2 paragraphs
    expect(kinds.filter((k) => k === 'persona-followup').length).toBe(4); // 2 followups × 2 paragraphs
    expect(kinds.filter((k) => k === 'custom-mask').length).toBe(3); // R1 + 2 followups
  });

  it('all intent_text values are canonicalized strings (no raw object)', async () => {
    mockedR1.mockResolvedValue([
      { id: 'a', round: 1, foxId: 'wen', mask: '路人读者', text: 't', tags: [] },
    ]);
    mockedRN.mockResolvedValue([]);
    mockedFu.mockResolvedValue({
      id: 'c', round: 1, foxId: 'wen', mask: '业内行家', text: 'fu', tags: [], replyToMask: '你',
    });

    await seedPersona();
    for (const call of mockedWrite.mock.calls) {
      const [, intent] = call;
      expect(typeof intent).toBe('string');
      expect(intent.length).toBeGreaterThan(0);
    }
  });
});

describe('seedDebate', () => {
  it('writes one entry per paragraph, each containing the full turn array', async () => {
    async function* fakeStream() {
      yield { id: 't1', foxId: 'wen', mask: 'x', position: 'pro', text: 'a' };
      yield { id: 't2', foxId: 'wen2', mask: 'y', position: 'con', text: 'b' };
    }
    mockedDebate.mockImplementation(() => fakeStream() as ReturnType<typeof debateStream>);

    const count = await seedDebate();
    expect(count).toBe(2);
    expect(mockedWrite).toHaveBeenCalledTimes(2);
    expect(mockedWrite.mock.calls[0][0]).toBe('persona-debate');
  });
});

describe('seedVoice', () => {
  it('writes 2 entries: one for fill, one for polish', async () => {
    async function* fakeStream() {
      yield { event: 'generic', data: { text: 'g' } };
      yield { event: 'final', data: { generic: 'g', voice: 'v', voiceSpans: [], voiceScore: { total: 0.9 }, trace: [], voiceSources: [] } };
    }
    mockedVoice.mockImplementation(() => fakeStream() as ReturnType<typeof voiceFillStream>);

    const count = await seedVoice();
    expect(count).toBe(2);
    expect(mockedWrite).toHaveBeenCalledTimes(2);
    const kinds = mockedWrite.mock.calls.map((c) => c[0]);
    expect(kinds).toEqual(['voice-fill', 'voice-fill']);
  });
});
