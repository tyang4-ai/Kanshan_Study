import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signSession } from '@/lib/auth/cookie-sign';

let cookieGet: (name: string) => { value: string } | undefined;

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => cookieGet(name),
  })),
}));

async function importRoute(): Promise<typeof import('@/app/api/auth/zhihu/me/route')> {
  return await import('@/app/api/auth/zhihu/me/route');
}

const SECRET = 'y'.repeat(32);

beforeEach(() => {
  cookieGet = () => undefined;
  vi.resetModules();
  vi.stubEnv('KANSHAN_SESSION_SECRET', SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/auth/zhihu/me', () => {
  it('401 when no session cookie', async () => {
    cookieGet = () => undefined;
    const { GET } = await importRoute();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('401 when session cookie is tampered', async () => {
    const token = signSession({ uid: 1, fullname: 'x', avatarPath: null, exp: Date.now() + 1000 }, SECRET);
    const [p, s] = token.split('.');
    const tampered = `${p}XX.${s}`;
    cookieGet = (n) => (n === 'kanshan-zhihu-session' ? { value: tampered } : undefined);
    const { GET } = await importRoute();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('401 when payload is expired', async () => {
    const token = signSession({ uid: 1, fullname: 'x', avatarPath: null, exp: Date.now() - 1000 }, SECRET);
    cookieGet = (n) => (n === 'kanshan-zhihu-session' ? { value: token } : undefined);
    const { GET } = await importRoute();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('200 with the payload when cookie is valid', async () => {
    const payload = { uid: 99, fullname: '我', avatarPath: '/me.jpg', exp: Date.now() + 60_000 };
    const token = signSession(payload, SECRET);
    cookieGet = (n) => (n === 'kanshan-zhihu-session' ? { value: token } : undefined);
    const { GET } = await importRoute();
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as typeof payload;
    expect(json.uid).toBe(99);
    expect(json.fullname).toBe('我');
    expect(json.avatarPath).toBe('/me.jpg');
  });
});
