import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/cookie-sign';

interface SessionPayload {
  uid: number;
  fullname: string;
  avatarPath: string | null;
  exp: number;
}

let cookieGet: (name: string) => { value: string } | undefined;

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => cookieGet(name),
    set: () => undefined,
  })),
}));

async function importRoute(): Promise<typeof import('@/app/api/auth/zhihu/callback/route')> {
  return await import('@/app/api/auth/zhihu/callback/route');
}

function setupEnv(): void {
  vi.stubEnv('ZHIHU_OAUTH_APP_ID', 'app-id-123');
  vi.stubEnv('ZHIHU_OAUTH_APP_KEY', 'app-key-456');
  vi.stubEnv('ZHIHU_OAUTH_REDIRECT_URI', 'https://example.com/cb');
  vi.stubEnv('KANSHAN_SESSION_SECRET', 'x'.repeat(32));
}

function makeReq(qs: string): NextRequest {
  return new NextRequest(`http://localhost/api/auth/zhihu/callback?${qs}`);
}

function locParams(res: Response): URLSearchParams {
  const loc = res.headers.get('location') ?? '';
  return new URL(loc, 'http://localhost').searchParams;
}

function findSetCookie(res: Response, name: string): string | null {
  const all = res.headers.getSetCookie?.() ?? [];
  for (const sc of all) {
    if (sc.startsWith(`${name}=`)) return sc;
  }
  return null;
}

const fetchMock = vi.fn();

beforeEach(() => {
  cookieGet = () => undefined;
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  vi.resetModules();
  setupEnv();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/auth/zhihu/callback', () => {
  it('redirects with auth_error=state_mismatch when state cookie missing', async () => {
    cookieGet = () => undefined;
    const { GET } = await importRoute();
    const res = await GET(makeReq('code=abc&state=zzz'));
    expect(res.status).toBe(307);
    expect(locParams(res).get('auth_error')).toBe('state_mismatch');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('redirects with auth_error=token_exchange_failed when /access_token responds non-ok', async () => {
    cookieGet = (n) => (n === 'kanshan-oauth-state' ? { value: 'good-state' } : undefined);
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 401 }));
    const { GET } = await importRoute();
    const res = await GET(makeReq('code=abc&state=good-state'));
    expect(locParams(res).get('auth_error')).toBe('token_exchange_failed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('redirects with auth_error=userinfo_failed when /user responds non-ok', async () => {
    cookieGet = (n) => (n === 'kanshan-oauth-state' ? { value: 'good-state' } : undefined);
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'tok', token_type: 'Bearer', expires_in: 3600 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response('nope', { status: 401 }));
    const { GET } = await importRoute();
    const res = await GET(makeReq('code=abc&state=good-state'));
    expect(locParams(res).get('auth_error')).toBe('userinfo_failed');
  });

  it('happy path: redirects to /?auth=success and sets a session cookie', async () => {
    cookieGet = (n) => (n === 'kanshan-oauth-state' ? { value: 'good-state' } : undefined);
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'tok', token_type: 'Bearer', expires_in: 3600 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ uid: 42, fullname: '路人甲', avatar_path: '/a.jpg' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    const { GET } = await importRoute();
    const res = await GET(makeReq('code=abc&state=good-state'));
    expect(locParams(res).get('auth')).toBe('success');
    const sessionCookie = findSetCookie(res, 'kanshan-zhihu-session');
    expect(sessionCookie).not.toBeNull();
  });

  it('verifies the session cookie payload with verifySession', async () => {
    cookieGet = (n) => (n === 'kanshan-oauth-state' ? { value: 'good-state' } : undefined);
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'tok', token_type: 'Bearer', expires_in: 3600 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ uid: 42, fullname: '路人甲', avatar_path: '/a.jpg' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    const { GET } = await importRoute();
    const res = await GET(makeReq('code=abc&state=good-state'));
    const sessionCookie = findSetCookie(res, 'kanshan-zhihu-session') ?? '';
    const token = sessionCookie.split(';')[0].split('=').slice(1).join('=');
    const payload = verifySession<SessionPayload>(token, 'x'.repeat(32));
    expect(payload).not.toBeNull();
    expect(payload?.uid).toBe(42);
    expect(payload?.fullname).toBe('路人甲');
    expect(payload?.avatarPath).toBe('/a.jpg');
  });

  it('clears the state cookie after a successful handshake', async () => {
    cookieGet = (n) => (n === 'kanshan-oauth-state' ? { value: 'good-state' } : undefined);
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'tok' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ uid: 42, fullname: '路人甲', avatar_path: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    const { GET } = await importRoute();
    const res = await GET(makeReq('code=abc&state=good-state'));
    const stateCookie = findSetCookie(res, 'kanshan-oauth-state') ?? '';
    expect(stateCookie).toMatch(/Max-Age=0/i);
  });
});
