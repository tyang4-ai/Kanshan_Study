import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rerank } from '@/lib/rerank';

describe('rerank', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SILICONFLOW_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns ranked results on happy path', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          { index: 2, relevance_score: 0.9 },
          { index: 0, relevance_score: 0.5 },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await rerank('query', ['a', 'b', 'c']);
    expect(result).toEqual([
      { index: 2, score: 0.9 },
      { index: 0, score: 0.5 },
    ]);
  });

  it('returns [] for empty docs without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await rerank('q', []);
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when SILICONFLOW_API_KEY is missing', async () => {
    vi.stubEnv('SILICONFLOW_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(rerank('q', ['a'])).rejects.toThrow('SILICONFLOW_API_KEY is not set');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws on 429 with no retry', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(rerank('q', ['a'])).rejects.toThrow(/^Rerank 429/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws on 500', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'server error',
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(rerank('q', ['a'])).rejects.toThrow(/^Rerank 500/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('passes topK as top_n in request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await rerank('q', ['a', 'b'], 5);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.siliconflow.cn/v1/rerank');
    expect(JSON.parse(init.body)).toEqual({
      model: 'Qwen/Qwen3-Reranker-8B',
      query: 'q',
      documents: ['a', 'b'],
      top_n: 5,
    });
  });
});
