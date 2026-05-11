import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chat, chatJson } from '@/lib/llm/kimi';

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

describe('kimi client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('KIMI_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('happy path: returns string content from 200 response and POSTs to /v1/chat/completions', async () => {
    const fetchMock = mockFetchOk('hello world');
    const out = await chat([{ role: 'user', content: 'hi' }]);
    expect(out).toBe('hello world');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    const url = call[0] as string;
    expect(url).toMatch(/\/v1\/chat\/completions$/);
    const init = call[1] as RequestInit;
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-key');
    expect(headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('moonshot-v1-128k');
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('default model is moonshot-v1-128k when opts.model omitted', async () => {
    const fetchMock = mockFetchOk('ok');
    await chat([{ role: 'user', content: 'x' }]);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.model).toBe('moonshot-v1-128k');
  });

  it('opts.model="moonshot-v1-128k" sets that model in request body', async () => {
    const fetchMock = mockFetchOk('ok');
    await chat([{ role: 'user', content: 'x' }], { model: 'moonshot-v1-128k' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.model).toBe('moonshot-v1-128k');
  });

  it('throws when messages array is empty', async () => {
    mockFetchOk('ok');
    await expect(chat([])).rejects.toThrow('chat: messages must be non-empty');
  });

  it('throws when KIMI_API_KEY is missing', async () => {
    vi.stubEnv('KIMI_API_KEY', '');
    mockFetchOk('ok');
    await expect(chat([{ role: 'user', content: 'x' }])).rejects.toThrow(
      'KIMI_API_KEY is not set',
    );
  });

  it('throws on 401 with status in message', async () => {
    mockFetchStatus(401, 'unauthorized');
    await expect(chat([{ role: 'user', content: 'x' }])).rejects.toThrow(/Kimi 401/);
  });

  it('throws on 429 with status in message', async () => {
    mockFetchStatus(429, 'rate limited');
    await expect(chat([{ role: 'user', content: 'x' }])).rejects.toThrow(/Kimi 429/);
  });

  it('throws on 500', async () => {
    mockFetchStatus(500, 'boom');
    await expect(chat([{ role: 'user', content: 'x' }])).rejects.toThrow(/Kimi 500/);
  });

  it('includes response_format: { type: "json_object" } when opts.jsonMode === true', async () => {
    const fetchMock = mockFetchOk('{}');
    await chat([{ role: 'user', content: 'x' }], { jsonMode: true });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('omits response_format when opts.jsonMode is not set', async () => {
    const fetchMock = mockFetchOk('hello');
    await chat([{ role: 'user', content: 'x' }]);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.response_format).toBeUndefined();
  });

  it('chatJson happy path: parses raw JSON', async () => {
    mockFetchOk('{"score":0.9}');
    const out = await chatJson<{ score: number }>([{ role: 'user', content: 'x' }]);
    expect(out).toEqual({ score: 0.9 });
  });

  it('chatJson invokes underlying chat with jsonMode: true', async () => {
    const fetchMock = mockFetchOk('{"x":1}');
    await chatJson<{ x: number }>([{ role: 'user', content: 'x' }]);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('chatJson strips ```json fences (defense-in-depth)', async () => {
    mockFetchOk('```json\n{"x":1}\n```');
    const out = await chatJson<{ x: number }>([{ role: 'user', content: 'x' }]);
    expect(out).toEqual({ x: 1 });
  });

  it('chatJson strips bare ``` fences', async () => {
    mockFetchOk('```\n{"y":2}\n```');
    const out = await chatJson<{ y: number }>([{ role: 'user', content: 'x' }]);
    expect(out).toEqual({ y: 2 });
  });

  it('chatJson throws typed LlmJsonParseError on malformed JSON', async () => {
    mockFetchOk('not json');
    // Persona-review 2026-05-11 P0 (Wei Zhang code-quality): wrap the bare
    // JSON.parse SyntaxError in a typed LlmJsonParseError so route handlers
    // can emit a clean SSE `event: error` instead of bubbling a 500. The error
    // carries the raw response in `.raw` for debugging.
    const { LlmJsonParseError } = await import('@/lib/llm/kimi');
    await expect(
      chatJson<unknown>([{ role: 'user', content: 'x' }]),
    ).rejects.toBeInstanceOf(LlmJsonParseError);
  });
});
