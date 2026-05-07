import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock is hoisted, so the factory must not reference top-level imports.
vi.mock('@/lib/llm/kimi', () => ({
  chat: vi.fn(async () => 'kimi-chat-result'),
  chatJson: vi.fn(async () => ({ provider: 'kimi' })),
  GENERIC_SYSTEM_PROMPT: 'kimi-generic',
  VOICE_SYSTEM_PROMPT: 'kimi-voice',
}));

vi.mock('@/lib/llm/deepseek', () => ({
  chat: vi.fn(async () => 'deepseek-chat-result'),
  chatJson: vi.fn(async () => ({ provider: 'deepseek' })),
  GENERIC_SYSTEM_PROMPT: 'deepseek-generic',
  VOICE_SYSTEM_PROMPT: 'deepseek-voice',
}));

import * as kimi from '@/lib/llm/kimi';
import * as deepseek from '@/lib/llm/deepseek';
import { chat, chatJson } from '@/lib/llm';

const kimiChat = vi.mocked(kimi.chat);
const kimiChatJson = vi.mocked(kimi.chatJson);
const deepseekChat = vi.mocked(deepseek.chat);
const deepseekChatJson = vi.mocked(deepseek.chatJson);

const MSG = [{ role: 'user' as const, content: 'hi' }];

describe('llm router · chat() dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('default provider (no opt) → kimi.chat is called, deepseek.chat is NOT', async () => {
    const out = await chat(MSG, {});
    expect(out).toBe('kimi-chat-result');
    expect(kimiChat).toHaveBeenCalledTimes(1);
    expect(deepseekChat).not.toHaveBeenCalled();
  });

  it('provider: "kimi" → kimi.chat is called, deepseek.chat is NOT', async () => {
    await chat(MSG, { provider: 'kimi' });
    expect(kimiChat).toHaveBeenCalledTimes(1);
    expect(deepseekChat).not.toHaveBeenCalled();
  });

  it('provider: "deepseek" → deepseek.chat is called, kimi.chat is NOT', async () => {
    const out = await chat(MSG, { provider: 'deepseek' });
    expect(out).toBe('deepseek-chat-result');
    expect(deepseekChat).toHaveBeenCalledTimes(1);
    expect(kimiChat).not.toHaveBeenCalled();
  });

  it('model remap: provider kimi + model "deepseek-chat" → kimi.chat called with "moonshot-v1-128k"', async () => {
    await chat(MSG, { provider: 'kimi', model: 'deepseek-chat' });
    expect(kimiChat).toHaveBeenCalledTimes(1);
    const opts = kimiChat.mock.calls[0][1];
    expect(opts?.model).toBe('moonshot-v1-128k');
  });

  it('model remap: provider kimi + model "deepseek-reasoner" → kimi.chat called with "moonshot-v1-128k"', async () => {
    await chat(MSG, { provider: 'kimi', model: 'deepseek-reasoner' });
    const opts = kimiChat.mock.calls[0][1];
    expect(opts?.model).toBe('moonshot-v1-128k');
  });

  it('model passthrough: provider kimi + native kimi model is passed through unchanged', async () => {
    await chat(MSG, { provider: 'kimi', model: 'moonshot-v1-128k' });
    const opts = kimiChat.mock.calls[0][1];
    expect(opts?.model).toBe('moonshot-v1-128k');
  });

  it('model passthrough: provider kimi + moonshot-v1-128k is passed through', async () => {
    await chat(MSG, { provider: 'kimi', model: 'moonshot-v1-128k' });
    const opts = kimiChat.mock.calls[0][1];
    expect(opts?.model).toBe('moonshot-v1-128k');
  });

  it('deepseek path: native deepseek model name is passed through', async () => {
    await chat(MSG, { provider: 'deepseek', model: 'deepseek-reasoner' });
    const opts = deepseekChat.mock.calls[0][1];
    expect(opts?.model).toBe('deepseek-reasoner');
  });

  it('deepseek path: non-deepseek model name falls back to "deepseek-chat"', async () => {
    await chat(MSG, { provider: 'deepseek', model: 'moonshot-v1-128k' });
    const opts = deepseekChat.mock.calls[0][1];
    expect(opts?.model).toBe('deepseek-chat');
  });

  it('jsonMode flag is forwarded to kimi.chat', async () => {
    await chat(MSG, { provider: 'kimi', jsonMode: true });
    const opts = kimiChat.mock.calls[0][1];
    expect(opts?.jsonMode).toBe(true);
  });

  it('jsonMode flag is forwarded to deepseek.chat', async () => {
    await chat(MSG, { provider: 'deepseek', jsonMode: true });
    const opts = deepseekChat.mock.calls[0][1];
    expect(opts?.jsonMode).toBe(true);
  });

  it('temperature, maxTokens, apiKey forwarded to selected provider', async () => {
    await chat(MSG, {
      provider: 'kimi',
      temperature: 0.42,
      maxTokens: 123,
      apiKey: 'sk-byo',
    });
    const opts = kimiChat.mock.calls[0][1];
    expect(opts?.temperature).toBe(0.42);
    expect(opts?.maxTokens).toBe(123);
    expect(opts?.apiKey).toBe('sk-byo');
  });
});

describe('llm router · chatJson() dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('default provider → kimi.chatJson called', async () => {
    const out = await chatJson<{ provider: string }>(MSG, {});
    expect(out).toEqual({ provider: 'kimi' });
    expect(kimiChatJson).toHaveBeenCalledTimes(1);
    expect(deepseekChatJson).not.toHaveBeenCalled();
  });

  it('provider: "deepseek" → deepseek.chatJson called', async () => {
    const out = await chatJson<{ provider: string }>(MSG, { provider: 'deepseek' });
    expect(out).toEqual({ provider: 'deepseek' });
    expect(deepseekChatJson).toHaveBeenCalledTimes(1);
    expect(kimiChatJson).not.toHaveBeenCalled();
  });

  it('chatJson model remap: provider kimi + model "deepseek-chat" → kimi.chatJson called with "moonshot-v1-128k"', async () => {
    await chatJson(MSG, { provider: 'kimi', model: 'deepseek-chat' });
    const opts = kimiChatJson.mock.calls[0][1];
    expect(opts?.model).toBe('moonshot-v1-128k');
  });

  it('chatJson deepseek path: non-deepseek model falls back to "deepseek-chat"', async () => {
    await chatJson(MSG, { provider: 'deepseek', model: 'moonshot-v1-128k' });
    const opts = deepseekChatJson.mock.calls[0][1];
    expect(opts?.model).toBe('deepseek-chat');
  });

  it('chatJson temperature/maxTokens/apiKey forwarded', async () => {
    await chatJson(MSG, {
      provider: 'kimi',
      temperature: 0.1,
      maxTokens: 50,
      apiKey: 'sk-x',
    });
    const opts = kimiChatJson.mock.calls[0][1];
    expect(opts?.temperature).toBe(0.1);
    expect(opts?.maxTokens).toBe(50);
    expect(opts?.apiKey).toBe('sk-x');
  });
});
