import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Force MODE='real' for these tests by mutating env BEFORE the module loads.
// Vitest evaluates the import after this beforeAll, so process.env.ZHIHU_API_MODE
// is already 'real' when lib/zhihu.ts reads it at module init.

const ORIGINAL_MODE = process.env.ZHIHU_API_MODE;
const ORIGINAL_ACCESS = process.env.ZHIHU_ACCESS_SECRET;
const ORIGINAL_APP_KEY = process.env.ZHIHU_APP_KEY;
const ORIGINAL_APP_SECRET = process.env.ZHIHU_APP_SECRET;

beforeEach(() => {
  process.env.ZHIHU_API_MODE = 'real';
  process.env.ZHIHU_ACCESS_SECRET = 'test-access-secret-32characters!!';
  process.env.ZHIHU_APP_KEY = 'test-user-token';
  process.env.ZHIHU_APP_SECRET = 'test-hmac-secret-32characters!!!';
  vi.resetModules();
});

afterEach(() => {
  process.env.ZHIHU_API_MODE = ORIGINAL_MODE;
  process.env.ZHIHU_ACCESS_SECRET = ORIGINAL_ACCESS;
  process.env.ZHIHU_APP_KEY = ORIGINAL_APP_KEY;
  process.env.ZHIHU_APP_SECRET = ORIGINAL_APP_SECRET;
  vi.restoreAllMocks();
});

describe('zhihu adapter real-mode error handling', () => {
  it('getHotList throws with status code on 401 from dev-platform', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('unauthorized', { status: 401 }),
    );
    const { getHotList } = await import('@/lib/zhihu');
    await expect(getHotList()).rejects.toThrow(/401/);
  });

  it('getHotList throws on 429 rate limit', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('rate limited', { status: 429 }),
    );
    const { getHotList } = await import('@/lib/zhihu');
    await expect(getHotList()).rejects.toThrow(/429/);
  });

  it('getHotList throws on 500 server error with body excerpt', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('internal server error xxx yyy zzz', { status: 500 }),
    );
    const { getHotList } = await import('@/lib/zhihu');
    await expect(getHotList()).rejects.toThrow(/500/);
  });

  it('getHotList propagates network failure (fetch reject)', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const { getHotList } = await import('@/lib/zhihu');
    await expect(getHotList()).rejects.toThrow('Failed to fetch');
  });

  it('getHotList throws with Code != 0 from dev-platform Body', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ Code: 30001, Message: '频率限制', Data: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const { getHotList } = await import('@/lib/zhihu');
    await expect(getHotList()).rejects.toThrow(/30001/);
  });

  it('getStoryList throws on HMAC openapi 401', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('signature invalid', { status: 401 }),
    );
    const { getStoryList } = await import('@/lib/zhihu');
    await expect(getStoryList()).rejects.toThrow(/401/);
  });

  it('getStoryList throws on non-zero {status} from openapi unwrap', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 20001, msg: '鉴权失败', data: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const { getStoryList } = await import('@/lib/zhihu');
    await expect(getStoryList()).rejects.toThrow('鉴权失败');
  });

  it('getHotList throws when ZHIHU_ACCESS_SECRET missing in real mode', async () => {
    delete process.env.ZHIHU_ACCESS_SECRET;
    vi.resetModules();
    const { getHotList } = await import('@/lib/zhihu');
    await expect(getHotList()).rejects.toThrow(/ZHIHU_ACCESS_SECRET/);
  });

  it('getStoryList throws when ZHIHU_APP_KEY/SECRET missing in real mode', async () => {
    delete process.env.ZHIHU_APP_KEY;
    delete process.env.ZHIHU_APP_SECRET;
    vi.resetModules();
    const { getStoryList } = await import('@/lib/zhihu');
    await expect(getStoryList()).rejects.toThrow(/ZHIHU_APP_KEY/);
  });

  it('getHotList throws readable error on 200 OK + non-JSON body (CDN HTML page)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('<html>502 bad gateway</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    );
    const { getHotList } = await import('@/lib/zhihu');
    await expect(getHotList()).rejects.toThrow(/invalid JSON body/);
  });

  it('getStoryList throws readable error on 200 OK + non-JSON body (HMAC path)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('not-json', { status: 200 }),
    );
    const { getStoryList } = await import('@/lib/zhihu');
    await expect(getStoryList()).rejects.toThrow(/invalid JSON body/);
  });
});
