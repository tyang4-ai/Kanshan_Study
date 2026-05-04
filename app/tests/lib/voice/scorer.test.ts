import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scoreVoice } from '@/lib/voice/scorer';
import { extractFeatures, createJieba, type VoiceFeatures } from '@/lib/voice/features';
import { chatJson } from '@/lib/llm/deepseek';
import { embed } from '@/lib/embeddings';

vi.mock('@/lib/llm/deepseek', () => ({ chatJson: vi.fn() }));
vi.mock('@/lib/embeddings', () => ({ embed: vi.fn() }));

const mockedChatJson = vi.mocked(chatJson);
const mockedEmbed = vi.mocked(embed);

function makeBaseline(overrides: Partial<VoiceFeatures> = {}): VoiceFeatures {
  return {
    avgSentenceLength: 30,
    sentenceLengthCV: 0.4,
    idiomDensity: 1,
    genericFunctionWordRate: 1,
    rhetoricalQuestionRate: 1,
    paragraphLengthCV: 0.3,
    openingDistribution: {
      rhetoricalQuestion: 0,
      firstPersonAnecdote: 0.5,
      specificFact: 0.2,
      generalClaim: 0,
      enumeration: 0,
      other: 0.3,
    },
    citationDensity: 1,
    charCount: 1000,
    sentenceCount: 30,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedChatJson.mockResolvedValue({ score: 0.5, reason: 'mid' });
  mockedEmbed.mockResolvedValue([
    [1, 0, 0],
    [1, 0, 0],
  ]);
});

describe('scoreVoice', () => {
  it('happy path: combines hard, judge, and embedding via W_HARD/W_LLM/W_EMB', async () => {
    mockedChatJson.mockResolvedValue({ score: 0.9, reason: '似' });
    mockedEmbed.mockResolvedValue([
      [1, 0, 0],
      [0.9, 0.1, 0],
    ]);

    const draft = '我昨天去了趟实验室，把那批样品重新跑了一遍。结果出乎意料。';
    const samples = ['我前天在实验室做了一组对照实验。数据还算干净。'];
    const baseline = makeBaseline({ sentenceLengthCV: 0.4 });

    const result = await scoreVoice(draft, baseline, samples);

    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThanOrEqual(1);
    expect(result.llmJudge).toBeCloseTo(0.9, 5);
    expect(result.embedding).toBeGreaterThan(0.9);
    expect(result.sub).toHaveProperty('aiTaste');
    expect(result.sub).toHaveProperty('wordAlignment');
    expect(result.sub).toHaveProperty('sentenceVar');
    expect(result.rationale).toMatch(/hard .* \| judge .* \| emb .*/);

    // total = clamp(0.4*hard + 0.4*0.9 + 0.2*emb)
    const expected = Math.min(
      1,
      0.4 * result.hardSignal + 0.4 * result.llmJudge + 0.2 * result.embedding,
    );
    expect(result.total).toBeCloseTo(expected, 5);
  });

  it('all generic-heavy draft drops aiTaste sub-score', async () => {
    // genericFunctionWordRate is per-1000-char; pack many markers into a short text.
    const draft = '首先这样。其次那样。再次另说。最后综上所述众所周知毋庸置疑不可否认。';
    const samples = ['完全不同的内容，讲讲个人经历。'];
    const baseline = makeBaseline();

    const result = await scoreVoice(draft, baseline, samples);

    expect(result.sub.aiTaste).toBeLessThan(0.5);
  });

  it('high alignment when draft equals one sample', async () => {
    const sample =
      '潜移默化的影响往往最难察觉。我做实验时常常忘记记笔记。后来吃了亏。';
    const baseline = makeBaseline();

    const result = await scoreVoice(sample, baseline, [sample]);

    expect(result.sub.wordAlignment).toBeGreaterThan(0.9);
  });

  it('zero samples → embedding sub-score is 0; jaccard with empty string is 0', async () => {
    const draft = '一段普通的内容用来测试。这里没有任何参照。';
    const baseline = makeBaseline();

    const result = await scoreVoice(draft, baseline, []);

    expect(result.embedding).toBe(0);
    expect(result.sub.wordAlignment).toBe(0);
    // embed should not have been called
    expect(mockedEmbed).not.toHaveBeenCalled();
  });

  it('LLM judge throws → falls back to 0.5; total still computes', async () => {
    mockedChatJson.mockRejectedValue(new Error('network down'));

    const draft = '我做了一个小实验，结果挺有意思。';
    const samples = ['一段示例文字。'];
    const baseline = makeBaseline();

    const result = await scoreVoice(draft, baseline, samples);

    expect(result.llmJudge).toBe(0.5);
    expect(Number.isFinite(result.total)).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(1);
  });

  it('embed throws → falls back to 0; total still computes', async () => {
    mockedEmbed.mockRejectedValue(new Error('embed down'));

    const draft = '我做了一个小实验，结果挺有意思。';
    const samples = ['一段示例文字。'];
    const baseline = makeBaseline();

    const result = await scoreVoice(draft, baseline, samples);

    expect(result.embedding).toBe(0);
    expect(Number.isFinite(result.total)).toBe(true);
  });

  it('clamps llmJudge to [0,1] when model returns out-of-range score', async () => {
    mockedChatJson.mockResolvedValue({ score: 1.7, reason: 'too high' });
    const draft = '我做了一个小实验，结果挺有意思。';
    const samples = ['一段示例文字。'];
    const baseline = makeBaseline();

    const result = await scoreVoice(draft, baseline, samples);

    expect(result.llmJudge).toBe(1);
    expect(result.total).toBeLessThanOrEqual(1);
  });

  it('clamps total to [0,1] even with overshooting sub-signals', async () => {
    mockedChatJson.mockResolvedValue({ score: 5, reason: 'overshoot' });
    mockedEmbed.mockResolvedValue([
      [1, 0],
      [10, 0],
    ]);

    const draft = '一段简短的中文。';
    const samples = ['另一段中文样本。'];
    const baseline = makeBaseline({ sentenceLengthCV: 0.0001 }); // forces sentenceVar to clamp

    const result = await scoreVoice(draft, baseline, samples);

    expect(result.total).toBeLessThanOrEqual(1);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.sub.sentenceVar).toBeLessThanOrEqual(1);
    expect(result.embedding).toBeLessThanOrEqual(1);
    expect(result.llmJudge).toBeLessThanOrEqual(1);
  });

  it('embedding cosine: identical vectors → similarity 1', async () => {
    mockedEmbed.mockResolvedValue([
      [0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5],
    ]);
    const draft = '内容一。';
    const samples = ['内容二。'];
    const baseline = makeBaseline();

    const result = await scoreVoice(draft, baseline, samples);

    expect(result.embedding).toBeCloseTo(1, 5);
  });

  it('embedding cosine: orthogonal vectors → similarity ≈ 0', async () => {
    mockedEmbed.mockResolvedValue([
      [1, 0, 0],
      [0, 1, 0],
    ]);
    const draft = '内容一。';
    const samples = ['内容二。'];
    const baseline = makeBaseline();

    const result = await scoreVoice(draft, baseline, samples);

    expect(result.embedding).toBeCloseTo(0, 5);
  });

  it('uses default baselineCV (0.4) when userBaseline.sentenceLengthCV is 0', async () => {
    const draft = '一段长一点。又一段比较短的话。哦还有这个。';
    const samples = ['示例。'];
    const baseline = makeBaseline({ sentenceLengthCV: 0 });

    // Compute draft CV directly to compare
    const jieba = createJieba();
    const draftFeatures = extractFeatures([{ id: '_draft', body: draft }], jieba);
    const expectedSentenceVar = Math.min(
      1,
      Math.max(0, draftFeatures.sentenceLengthCV / 0.4),
    );

    const result = await scoreVoice(draft, baseline, samples);
    expect(result.sub.sentenceVar).toBeCloseTo(expectedSentenceVar, 5);
  });

  it('rationale string formats all three signals to two decimals', async () => {
    const draft = '一段普通的中文内容用于测试。';
    const samples = ['示例文字。'];
    const baseline = makeBaseline();

    const result = await scoreVoice(draft, baseline, samples);

    expect(result.rationale).toMatch(/^hard \d\.\d{2} \| judge \d\.\d{2} \| emb \d\.\d{2}$/);
  });
});
