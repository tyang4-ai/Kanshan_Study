import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chat, chatJson } from '@/lib/llm/deepseek';

function mockFetchOk(content: string): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async () =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

function mockFetchStatus(status: number, body = 'err'): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async () => new Response(body, { status }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('deepseek client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DEEPSEEK_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('happy path: returns string content from 200 response', async () => {
    const fetchMock = mockFetchOk('hello world');
    const out = await chat([{ role: 'user', content: 'hi' }]);
    expect(out).toBe('hello world');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(body.model).toBe('deepseek-chat');
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('default model is deepseek-chat when opts.model omitted', async () => {
    const fetchMock = mockFetchOk('ok');
    await chat([{ role: 'user', content: 'x' }]);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.model).toBe('deepseek-chat');
  });

  it('opts.model="deepseek-reasoner" sets reasoner in request body', async () => {
    const fetchMock = mockFetchOk('ok');
    await chat([{ role: 'user', content: 'x' }], { model: 'deepseek-reasoner' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.model).toBe('deepseek-reasoner');
  });

  it('throws when messages array is empty', async () => {
    mockFetchOk('ok');
    await expect(chat([])).rejects.toThrow('chat: messages must be non-empty');
  });

  it('throws when DEEPSEEK_API_KEY is missing', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', '');
    mockFetchOk('ok');
    await expect(chat([{ role: 'user', content: 'x' }])).rejects.toThrow(
      'DEEPSEEK_API_KEY is not set',
    );
  });

  it('throws on 429 with status in message', async () => {
    mockFetchStatus(429, 'rate limited');
    await expect(chat([{ role: 'user', content: 'x' }])).rejects.toThrow(/DeepSeek 429/);
  });

  it('throws on 500', async () => {
    mockFetchStatus(500, 'boom');
    await expect(chat([{ role: 'user', content: 'x' }])).rejects.toThrow(/DeepSeek 500/);
  });

  it('chatJson happy path: parses raw JSON', async () => {
    mockFetchOk('{"score":0.9}');
    const out = await chatJson<{ score: number }>([{ role: 'user', content: 'x' }]);
    expect(out).toEqual({ score: 0.9 });
  });

  it('chatJson strips ```json fences', async () => {
    mockFetchOk('```json\n{"x":1}\n```');
    const out = await chatJson<{ x: number }>([{ role: 'user', content: 'x' }]);
    expect(out).toEqual({ x: 1 });
  });

  it('chatJson strips bare ``` fences', async () => {
    mockFetchOk('```\n{"y":2}\n```');
    const out = await chatJson<{ y: number }>([{ role: 'user', content: 'x' }]);
    expect(out).toEqual({ y: 2 });
  });

  it('chatJson throws SyntaxError on malformed JSON', async () => {
    mockFetchOk('not json');
    await expect(
      chatJson<unknown>([{ role: 'user', content: 'x' }]),
    ).rejects.toThrow(SyntaxError);
  });
});
