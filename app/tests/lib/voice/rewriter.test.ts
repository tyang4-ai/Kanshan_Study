import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ScoreResult } from '@/lib/voice/scorer';
import type { VoiceFeatures } from '@/lib/voice/features';

vi.mock('@/lib/vault/search', () => ({ searchVault: vi.fn() }));
vi.mock('@/lib/llm', () => ({
  chat: vi.fn(),
  chatJson: vi.fn(),
  GENERIC_SYSTEM_PROMPT: 'g',
  VOICE_SYSTEM_PROMPT: 'v',
}));
vi.mock('@/lib/voice/scorer', () => ({ scoreVoice: vi.fn() }));

import { searchVault } from '@/lib/vault/search';
import { chat, chatJson } from '@/lib/llm';
import { scoreVoice } from '@/lib/voice/scorer';
import {
  voiceFillStream,
  pickWeakestSubScore,
  type VoiceFillEvent,
  type IterStep,
  type VoiceFillFinal,
} from '@/lib/voice/rewriter';

const mockedSearch = vi.mocked(searchVault);
const mockedChat = vi.mocked(chat);
const mockedChatJson = vi.mocked(chatJson);
const mockedScore = vi.mocked(scoreVoice);

function makeBaseline(): VoiceFeatures {
  return {
    avgSentenceLength: 30,
    sentenceLengthCV: 0.4,
    idiomDensity: 0,
    genericFunctionWordRate: 0,
    rhetoricalQuestionRate: 0,
    paragraphLengthCV: 0.3,
    openingDistribution: {
      rhetoricalQuestion: 0,
      firstPersonAnecdote: 0,
      specificFact: 0,
      generalClaim: 0,
      enumeration: 0,
      other: 1,
    },
    citationDensity: 0,
    charCount: 0,
    sentenceCount: 0,
  };
}

function makeScore(total: number): ScoreResult {
  return {
    total,
    hardSignal: total,
    llmJudge: total,
    embedding: total,
    sub: { aiTaste: total, wordAlignment: total, sentenceVar: total },
    rationale: `hard ${total.toFixed(2)} | judge ${total.toFixed(2)} | emb ${total.toFixed(2)}`,
  };
}

async function collect(stream: AsyncGenerator<VoiceFillEvent>): Promise<VoiceFillEvent[]> {
  const events: VoiceFillEvent[] = [];
  for await (const ev of stream) events.push(ev);
  return events;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedSearch.mockResolvedValue([
    {
      chunkId: 'c1',
      articleId: 'a1',
      title: '影像组学的转向',
      date: '2025-01-22',
      year: '2025',
      content: '样本文一段内容用于风格学习。',
      spineColor: null,
      borrows: 0,
      tags: [],
      score: 0.9,
    },
    {
      chunkId: 'c2',
      articleId: 'a2',
      title: '深夜门诊',
      date: '2024-08-01',
      year: '2024',
      content: '另一段样本文。',
      spineColor: null,
      borrows: 0,
      tags: [],
      score: 0.8,
    },
    {
      chunkId: 'c3',
      articleId: 'a3',
      title: '幸存者偏差',
      date: '2024-06-01',
      year: '2024',
      content: '第三段。',
      spineColor: null,
      borrows: 0,
      tags: [],
      score: 0.7,
    },
  ]);
});

describe('pickWeakestSubScore', () => {
  it('returns key with smallest value', () => {
    expect(pickWeakestSubScore({ aiTaste: 0.9, wordAlignment: 0.3, sentenceVar: 0.7 })).toBe(
      'wordAlignment'
    );
    expect(pickWeakestSubScore({ aiTaste: 0.1, wordAlignment: 0.5, sentenceVar: 0.9 })).toBe(
      'aiTaste'
    );
  });
});

describe('voiceFillStream', () => {
  it('full event sequence: 1 generic + 3 iter + 1 final, in order', async () => {
    mockedChat.mockResolvedValue('generic-text');
    mockedChatJson.mockResolvedValue({ text: 'voice-iter', voiceSpans: [] });
    mockedScore
      .mockResolvedValueOnce(makeScore(0.42))
      .mockResolvedValueOnce(makeScore(0.71))
      .mockResolvedValueOnce(makeScore(0.88));

    const events = await collect(
      voiceFillStream('guwanxi', 'bullets', 'fill', '', makeBaseline())
    );

    expect(events.map((e) => e.event)).toEqual(['generic', 'iter', 'iter', 'iter', 'final']);
    const final = events[events.length - 1].data as VoiceFillFinal;
    expect(final.trace.length).toBe(3);
    expect(final.voiceScore.total).toBeCloseTo(0.88, 5);
  });

  it('threshold early-exit: trace has only 1 step when first iter accepts', async () => {
    mockedChat.mockResolvedValue('generic-text');
    mockedChatJson.mockResolvedValue({ text: 'voice-good', voiceSpans: [] });
    mockedScore.mockResolvedValueOnce(makeScore(0.92));

    const events = await collect(
      voiceFillStream('guwanxi', 'bullets', 'fill', '', makeBaseline())
    );

    expect(events.map((e) => e.event)).toEqual(['generic', 'iter', 'final']);
    const iter = events[1].data as IterStep;
    expect(iter.accepted).toBe(true);
    const final = events[2].data as VoiceFillFinal;
    expect(final.trace.length).toBe(1);
  });

  it('searchVault throws → seed fallback used; still yields generic+iter+final', async () => {
    mockedSearch.mockRejectedValue(new Error('no DB'));
    mockedChat.mockResolvedValue('generic-text');
    mockedChatJson.mockResolvedValue({ text: 'voice-fb', voiceSpans: [] });
    mockedScore.mockResolvedValue(makeScore(0.9));

    const events = await collect(
      voiceFillStream('guwanxi', 'bullets', 'fill', '', makeBaseline())
    );

    const kinds = events.map((e) => e.event);
    expect(kinds[0]).toBe('generic');
    expect(kinds.includes('iter')).toBe(true);
    expect(kinds[kinds.length - 1]).toBe('final');
    const final = events[events.length - 1].data as VoiceFillFinal;
    // guwanxi seed fallback should produce sources
    expect(final.voiceSources.length).toBeGreaterThan(0);
  });

  it('searchVault throws for `me` → empty samples (voiceSources empty)', async () => {
    mockedSearch.mockRejectedValue(new Error('no DB'));
    mockedChat.mockResolvedValue('generic-text');
    mockedChatJson.mockResolvedValue({ text: 'voice-fb', voiceSpans: [] });
    mockedScore.mockResolvedValue(makeScore(0.9));

    const events = await collect(
      voiceFillStream('me', 'bullets', 'fill', '', makeBaseline())
    );
    const final = events[events.length - 1].data as VoiceFillFinal;
    expect(final.voiceSources.length).toBe(0);
  });

  it('draftVoice JSON throws → falls back to plain chat; voiceSpans empty', async () => {
    mockedChat
      .mockResolvedValueOnce('generic-text')   // draftGeneric
      .mockResolvedValueOnce('voice-fallback'); // draftVoice fallback
    mockedChatJson.mockRejectedValueOnce(new Error('bad JSON'));
    mockedScore.mockResolvedValue(makeScore(0.9));

    const events = await collect(
      voiceFillStream('guwanxi', 'bullets', 'fill', '', makeBaseline())
    );

    const iter = events[1].data as IterStep;
    expect(iter.draft).toBe('voice-fallback');
    expect(iter.voiceSpans).toEqual([]);
  });

  it('mid-stream chat throw propagates out of generator', async () => {
    mockedChat.mockRejectedValue(new Error('chat down'));

    const stream = voiceFillStream('guwanxi', 'bullets', 'fill', '', makeBaseline());
    await expect(collect(stream)).rejects.toThrow(/chat down/);
  });

  it('MAX_ITERS=3 enforced when scoreVoice never crosses threshold', async () => {
    mockedChat.mockResolvedValue('generic-text');
    mockedChatJson.mockResolvedValue({ text: 'voice-low', voiceSpans: [] });
    mockedScore.mockResolvedValue(makeScore(0.5));

    const events = await collect(
      voiceFillStream('guwanxi', 'bullets', 'fill', '', makeBaseline())
    );

    const iters = events.filter((e) => e.event === 'iter');
    expect(iters.length).toBe(3);
    const final = events[events.length - 1].data as VoiceFillFinal;
    expect(final.trace.length).toBe(3);
  });

  it('maps voice spans by sourceIndex into sourceArticleId/Title/Date', async () => {
    mockedChat.mockResolvedValue('generic-text');
    mockedChatJson.mockResolvedValue({
      text: 'voice-iter',
      voiceSpans: [{ start: 0, end: 5, sourceIndex: 0, rationale: 'r' }],
    });
    mockedScore.mockResolvedValueOnce(makeScore(0.95));

    const events = await collect(
      voiceFillStream('guwanxi', 'bullets', 'fill', '', makeBaseline())
    );
    const iter = events[1].data as IterStep;
    expect(iter.voiceSpans.length).toBe(1);
    expect(iter.voiceSpans[0].sourceArticleId).toBe('a1');
    expect(iter.voiceSpans[0].sourceTitle).toBe('影像组学的转向');
    expect(iter.voiceSpans[0].sourceDate).toBe('2025-01-22');
  });
});
