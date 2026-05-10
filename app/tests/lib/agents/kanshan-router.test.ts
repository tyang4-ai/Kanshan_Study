import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runKanshanTurn, KANSHAN_FALLBACK } from '@/lib/agents/kanshan-router';

vi.mock('@/lib/llm', async () => {
  const actual = await vi.importActual<typeof import('@/lib/llm')>('@/lib/llm');
  return {
    ...actual,
    chatJson: vi.fn(),
  };
});

import { chatJson } from '@/lib/llm';

const mockedChatJson = chatJson as unknown as ReturnType<typeof vi.fn>;

describe('runKanshanTurn', () => {
  beforeEach(() => {
    mockedChatJson.mockReset();
  });
  afterEach(() => {
    mockedChatJson.mockReset();
  });

  it('returns reply when LLM emits valid response', async () => {
    mockedChatJson.mockResolvedValue({ reply: '看山在听。', toolCall: null });
    const out = await runKanshanTurn([], 'hello', 'sk-stub', 'kimi');
    expect(out.reply).toBe('看山在听。');
    expect(out.toolCall).toBeUndefined();
  });

  it('passes through valid toolCall', async () => {
    mockedChatJson.mockResolvedValue({
      reply: '让看水查一下。',
      toolCall: { tool: 'open_research', args: { query: '影像组学' } },
    });
    const out = await runKanshanTurn([], '找点研究', 'sk-stub', 'kimi');
    expect(out.toolCall?.tool).toBe('open_research');
    expect(out.toolCall?.args).toEqual({ query: '影像组学' });
  });

  it('drops unknown tool name (keeps reply)', async () => {
    mockedChatJson.mockResolvedValue({
      reply: '试试这个。',
      toolCall: { tool: 'open_blackhole', args: {} },
    });
    const out = await runKanshanTurn([], 'X', 'sk-stub', 'kimi');
    expect(out.reply).toBe('试试这个。');
    expect(out.toolCall).toBeUndefined();
  });

  it('returns fallback on LLM error', async () => {
    mockedChatJson.mockRejectedValue(new Error('rate limit'));
    const out = await runKanshanTurn([], 'X', 'sk-stub', 'kimi');
    expect(out.reply).toBe(KANSHAN_FALLBACK.reply);
  });

  it('returns fallback when reply is empty', async () => {
    mockedChatJson.mockResolvedValue({ reply: '', toolCall: null });
    const out = await runKanshanTurn([], 'X', 'sk-stub', 'kimi');
    expect(out.reply).toBe(KANSHAN_FALLBACK.reply);
  });
});
