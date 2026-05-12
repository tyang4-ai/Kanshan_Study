import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

interface CookieRecord {
  name: string;
  value: string;
  options: { httpOnly?: boolean; sameSite?: string; maxAge?: number; path?: string; secure?: boolean };
}

const setCookies: CookieRecord[] = [];

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: () => undefined,
    set: (name: string, value: string, options: CookieRecord['options']) => {
      setCookies.push({ name, value, options });
    },
  })),
}));

async function importRoute(): Promise<typeof import('@/app/api/auth/zhihu/start/route')> {
  return await import('@/app/api/auth/zhihu/start/route');
}

function makeReq(url = 'http://localhost/api/auth/zhihu/start'): NextRequest {
  return new NextRequest(url);
}

beforeEach(() => {
  setCookies.length = 0;
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/auth/zhihu/start', () => {
  it('returns 503 when ZHIHU_OAUTH_APP_ID is missing', async () => {
    vi.stubEnv('ZHIHU_OAUTH_APP_ID', '');
    vi.stubEnv('ZHIHU_OAUTH_REDIRECT_URI', 'https://example.com/cb');
    const { GET } = await importRoute();
    const res = await GET(makeReq());
    expect(res.status).toBe(503);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('OAuth');
  });

  it('redirects to zhihu with a state cookie set', async () => {
    vi.stubEnv('ZHIHU_OAUTH_APP_ID', 'app-id-123');
    vi.stubEnv('ZHIHU_OAUTH_APP_KEY', 'app-key-456');
    vi.stubEnv('ZHIHU_OAUTH_REDIRECT_URI', 'https://example.com/cb');
    vi.stubEnv('ZHIHU_OAUTH_AUTHORIZE_URL', '');
    const { GET } = await importRoute();
    const res = await GET(makeReq());
    expect(res.status).toBe(302);
    const loc = res.headers.get('location') ?? '';
    expect(loc).toContain('zhihu.com');
    expect(loc).toContain('client_id=app-id-123');
    expect(loc).toContain('response_type=code');
    expect(loc).toContain('state=');
    const stateCookie = setCookies.find((c) => c.name === 'kanshan-oauth-state');
    expect(stateCookie).toBeDefined();
    expect(stateCookie?.options.httpOnly).toBe(true);
    expect(stateCookie?.options.sameSite).toBe('lax');
    expect(stateCookie?.options.maxAge).toBe(600);
  });

  it('returns JSON with authorizeUrl + state when ?debug=1', async () => {
    vi.stubEnv('ZHIHU_OAUTH_APP_ID', 'app-id-123');
    vi.stubEnv('ZHIHU_OAUTH_REDIRECT_URI', 'https://example.com/cb');
    const { GET } = await importRoute();
    const res = await GET(makeReq('http://localhost/api/auth/zhihu/start?debug=1'));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { authorizeUrl: string; state: string };
    expect(json.authorizeUrl).toContain('zhihu.com');
    expect(json.state).toMatch(/^[0-9a-f]{32}$/);
  });

  it('produces a state that is exactly 32 hex chars', async () => {
    vi.stubEnv('ZHIHU_OAUTH_APP_ID', 'app-id-123');
    vi.stubEnv('ZHIHU_OAUTH_REDIRECT_URI', 'https://example.com/cb');
    const { GET } = await importRoute();
    await GET(makeReq());
    const stateCookie = setCookies.find((c) => c.name === 'kanshan-oauth-state');
    expect(stateCookie?.value).toMatch(/^[0-9a-f]{32}$/);
  });
});
