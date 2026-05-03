import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { embed } from '@/lib/embeddings';

describe('embed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SILICONFLOW_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns embeddings on happy path', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { embedding: [0.1, 0.2, 0.3] },
          { embedding: [0.4, 0.5, 0.6] },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await embed(['hello', 'world']);
    expect(result).toEqual([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.siliconflow.cn/v1/embeddings');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ model: 'BAAI/bge-m3', input: ['hello', 'world'] });
  });

  it('returns [] for empty input without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await embed([]);
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when SILICONFLOW_API_KEY is missing', async () => {
    vi.stubEnv('SILICONFLOW_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(embed(['x'])).rejects.toThrow('SILICONFLOW_API_KEY is not set');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retries on 429 and throws after 3 attempts exhausted', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    });
    vi.stubGlobal('fetch', fetchMock);

    const promise = embed(['x']);
    const assertion = expect(promise).rejects.toThrow(/^Embed 429/);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries on 429 then succeeds on second call', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'rate limited',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ embedding: [0.1, 0.2] }] }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const promise = embed(['x']);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;
    expect(result).toEqual([[0.1, 0.2]]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws immediately on 500 without retry', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'server error',
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(embed(['x'])).rejects.toThrow(/^Embed 500/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
