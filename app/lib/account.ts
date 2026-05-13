export interface CurrentUser {
  id: string;
  displayName: string;
  bio: string;
}

const GUEST_BIO = '本浏览器专属访客身份 · 与其他浏览器完全隔离';

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
 * Returns the per-browser guest account ID issued by `middleware.ts`. Every
 * vault / visit-state / write path uses this as the `user_id` so no two
 * browsers can see each other's rows. Falls back to a literal `'anon'`
 * sentinel when the cookie is missing (should never happen post-middleware,
 * but keeps the type honest).
 */
export function getAccountId(req: Request | { headers: Headers }): string {
  return readCookie(req, 'kanshan-guest-id') ?? 'anon';
}

export function getCurrentUser(req?: Request): CurrentUser {
  if (!req) return { id: 'anon', displayName: '访客', bio: GUEST_BIO };
  const id = getAccountId(req);
  return { id, displayName: '访客', bio: GUEST_BIO };
}
