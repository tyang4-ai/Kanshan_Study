import { verifySession } from '@/lib/auth/cookie-sign';

export interface CurrentUser {
  id: string;
  displayName: string;
  bio: string;
}

interface ZhihuSessionPayload {
  uid: number;
  fullname: string;
  avatarPath: string | null;
  exp?: number;
}

function readCookie(req: Request | { headers: Headers }, name: string): string | null {
  const raw = req.headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

/**
 * Returns the verified zhihu OAuth session payload from the signed cookie,
 * or null if absent / tampered / expired.
 */
function readZhihuSession(req: Request | { headers: Headers }): ZhihuSessionPayload | null {
  const secret = process.env.KANSHAN_SESSION_SECRET;
  if (!secret) return null;
  const token = readCookie(req, 'kanshan-zhihu-session');
  if (!token) return null;
  return verifySession<ZhihuSessionPayload>(token, secret);
}

/**
 * Identity resolution for every server-scoped read/write:
 *
 *   1. If the user is signed in via 知乎 OAuth, use `zhihu-${uid}` —
 *      stable across browsers + devices, gives the user real cloud storage.
 *   2. Otherwise fall back to the per-browser `kanshan-guest-id` cookie
 *      issued by middleware — isolated per browser, no cross-device.
 *
 * Either way the value is never `'me'` / `'guwanxi'` (the old hardcoded
 * personas) — those rows in Supabase are now legacy / orphaned.
 */
export function getAccountId(req: Request | { headers: Headers }): string {
  const session = readZhihuSession(req);
  if (session && typeof session.uid === 'number') {
    return `zhihu-${session.uid}`;
  }
  return readCookie(req, 'kanshan-guest-id') ?? 'anon';
}

export function getCurrentUser(req?: Request): CurrentUser {
  if (!req) return { id: 'anon', displayName: '访客', bio: '本浏览器专属访客身份' };
  const session = readZhihuSession(req);
  if (session && typeof session.uid === 'number' && typeof session.fullname === 'string') {
    return {
      id: `zhihu-${session.uid}`,
      displayName: session.fullname,
      bio: '知乎登录账户 · 跨设备同步',
    };
  }
  const id = getAccountId(req);
  return { id, displayName: '访客', bio: '本浏览器专属访客身份' };
}
