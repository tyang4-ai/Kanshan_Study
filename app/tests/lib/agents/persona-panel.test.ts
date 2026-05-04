import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/llm/deepseek', () => ({
  chatJson: vi.fn(),
  chat: vi.fn(),
}));

import { chatJson } from '@/lib/llm/deepseek';
import {
  runRound1,
  runRoundN,
  routeFollowup,
  runFollowup,
  PERSONA_FALLBACK,
  FOLLOWUP_FALLBACK,
  type PersonaMessage,
  type SelectedMask,
} from '@/lib/agents/persona-panel';
import { FIXED_MASKS, type CustomMask } from '@/lib/personas';

const mockedChatJson = vi.mocked(chatJson);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runRound1', () => {
  it('returns one message per fixed mask with round=1, foxId="wen", no replyToMask', async () => {
    mockedChatJson.mockImplementation(async () => ({
      text: 'sample reaction',
      tags: ['t1', 't2'],
    }));
    const result = await runRound1('段落', FIXED_MASKS);
    expect(result).toHaveLength(4);
    for (const msg of result) {
      expect(msg.round).toBe(1);
      expect(msg.foxId).toBe('wen');
      expect(msg.text).toBe('sample reaction');
      expect(msg.tags).toEqual(['t1', 't2']);
      expect(msg.replyToMask).toBeUndefined();
    }
    expect(result.map((m) => m.mask)).toEqual([
      '路人读者',
      '业内行家',
      '社畜读者',
      '边界关注者',
    ]);
  });

  it('uses foxId="wen2" for custom masks', async () => {
    mockedChatJson.mockResolvedValue({ text: 'custom view', tags: [] });
    const custom: CustomMask = {
      id: 'c1',
      label: '医学博士读者',
      description: '神经科医生',
      fox: 'wen2',
    };
    const result = await runRound1('段落', [custom]);
    expect(result).toHaveLength(1);
    expect(result[0].foxId).toBe('wen2');
    expect(result[0].mask).toBe('医学博士读者');
  });

  it('coerces missing tags to empty array', async () => {
    mockedChatJson.mockResolvedValue({ text: 'ok' } as unknown as {
      text: string;
      tags: string[];
    });
    const result = await runRound1('段落', [FIXED_MASKS[0]]);
    expect(result[0].tags).toEqual([]);
  });
});

describe('runRoundN', () => {
  const baseHistory: PersonaMessage[] = [
    { id: 'a', round: 1, foxId: 'wen', mask: '路人读者', text: 'hi', tags: [] },
  ];

  it('skip:true returns no message for that mask', async () => {
    mockedChatJson.mockResolvedValue({ skip: true });
    const result = await runRoundN('段落', [FIXED_MASKS[0]], baseHistory, 2);
    expect(result).toHaveLength(0);
  });

  it('skip:false returns message with replyToMask + agree populated', async () => {
    mockedChatJson.mockResolvedValue({
      skip: false,
      text: 'reply text',
      tags: ['t'],
      replyToMask: '路人读者',
      agree: true,
    });
    const result = await runRoundN('段落', [FIXED_MASKS[1]], baseHistory, 2);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('reply text');
    expect(result[0].replyToMask).toBe('路人读者');
    expect(result[0].agree).toBe(true);
    expect(result[0].round).toBe(2);
    expect(result[0].mask).toBe('业内行家');
  });

  it('passes agree:null through as null', async () => {
    mockedChatJson.mockResolvedValue({
      skip: false,
      text: 'q',
      tags: [],
      replyToMask: '路人读者',
      agree: null,
    });
    const result = await runRoundN('段落', [FIXED_MASKS[1]], baseHistory, 3);
    expect(result[0].agree).toBeNull();
    expect(result[0].round).toBe(3);
  });

  it('handles mixed skip + non-skip across masks', async () => {
    mockedChatJson
      .mockResolvedValueOnce({ skip: true })
      .mockResolvedValueOnce({
        skip: false,
        text: 'second mask spoke',
        tags: [],
        replyToMask: '路人读者',
        agree: false,
      });
    const result = await runRoundN(
      '段落',
      [FIXED_MASKS[0], FIXED_MASKS[1]],
      baseHistory,
      2
    );
    expect(result).toHaveLength(1);
    expect(result[0].mask).toBe('业内行家');
    expect(result[0].agree).toBe(false);
  });
});

describe('routeFollowup', () => {
  it('returns mask matching chosenMaskLabel', async () => {
    mockedChatJson.mockResolvedValue({
      chosenMaskLabel: '业内行家',
      why: '专业问题',
    });
    const { mask, why } = await routeFollowup([], '请教术语', FIXED_MASKS);
    expect(mask.label).toBe('业内行家');
    expect(why).toBe('专业问题');
  });

  it('returns first mask if no label match', async () => {
    mockedChatJson.mockResolvedValue({
      chosenMaskLabel: '不存在的读者',
      why: '兜底',
    });
    const { mask } = await routeFollowup([], '问题', FIXED_MASKS);
    expect(mask.label).toBe(FIXED_MASKS[0].label);
  });
});

describe('runFollowup', () => {
  it('produces single message with replyToMask="你"', async () => {
    mockedChatJson.mockResolvedValue({ text: '回复用户', tags: ['follow'] });
    const msg = await runFollowup('段落', [], '你怎么看？', FIXED_MASKS[0]);
    expect(msg.replyToMask).toBe('你');
    expect(msg.text).toBe('回复用户');
    expect(msg.tags).toEqual(['follow']);
    expect(msg.foxId).toBe('wen');
    expect(msg.mask).toBe('路人读者');
    expect(msg.agree).toBeUndefined();
  });

  it('uses wen2 for custom mask followups', async () => {
    mockedChatJson.mockResolvedValue({ text: '自定义回应', tags: [] });
    const custom: CustomMask = {
      id: 'c1',
      label: '神经科医生',
      description: '神经外科主治',
      fox: 'wen2',
    };
    const msg = await runFollowup('段落', [], '问题', custom);
    expect(msg.foxId).toBe('wen2');
    expect(msg.mask).toBe('神经科医生');
    expect(msg.replyToMask).toBe('你');
  });
});

describe('PERSONA_FALLBACK', () => {
  it('has 5 entries with rounds 1,1,1,1,2', () => {
    expect(PERSONA_FALLBACK).toHaveLength(5);
    expect(PERSONA_FALLBACK.slice(0, 4).every((m) => m.round === 1)).toBe(true);
    expect(PERSONA_FALLBACK[4].round).toBe(2);
    expect(PERSONA_FALLBACK[4].replyToMask).toBe('边界关注者');
    expect(PERSONA_FALLBACK[4].agree).toBe(true);
  });
});

describe('FOLLOWUP_FALLBACK', () => {
  it('returns mask with replyToMask="你" and tags including "mock"', () => {
    const mask: SelectedMask = FIXED_MASKS[0];
    const msg = FOLLOWUP_FALLBACK('一个很长的追问内容', mask);
    expect(msg.replyToMask).toBe('你');
    expect(msg.tags).toContain('mock');
    expect(msg.mask).toBe('路人读者');
    expect(msg.foxId).toBe('wen');
  });

  it('uses wen2 foxId for custom mask', () => {
    const custom: CustomMask = {
      id: 'c1',
      label: '某读者',
      description: 'desc',
      fox: 'wen2',
    };
    const msg = FOLLOWUP_FALLBACK('msg', custom);
    expect(msg.foxId).toBe('wen2');
    expect(msg.mask).toBe('某读者');
  });
});
