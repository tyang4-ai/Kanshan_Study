// Diagnostic route — hits the OAuth-bearer 知乎 endpoints directly with the
// session's access_token and returns the raw status + body, so we can see
// exactly what comes back without our coercion layer in the way.
// Local-debug only; not linked from any UI.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/cookie-sign';

export const runtime = 'nodejs';

interface SessionPayload {
  uid: string;
  fullname: string;
  avatarPath: string | null;
  accessToken?: string;
  exp: number;
}

async function getToken(): Promise<string | undefined> {
  const secret = process.env.KANSHAN_SESSION_SECRET;
  if (!secret) return undefined;
  const jar = await cookies();
  const t = jar.get('kanshan-zhihu-session')?.value;
  if (!t) return undefined;
  return verifySession<SessionPayload>(t, secret)?.accessToken;
}

async function probe(url: string, token: string) {
  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    const text = await r.text();
    return { url, status: r.status, body: text.slice(0, 1000) };
  } catch (e) {
    return { url, error: (e as Error).message };
  }
}

export async function GET(): Promise<NextResponse> {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: 'no_access_token' }, { status: 401 });
  const results = await Promise.all([
    probe('https://openapi.zhihu.com/user', token),
    probe('https://openapi.zhihu.com/user/moments', token),
    probe('https://openapi.zhihu.com/user/followers?page=0&per_page=5', token),
    probe('https://openapi.zhihu.com/user/followed?page=0&per_page=5', token),
  ]);
  return NextResponse.json({ tokenLength: token.length, results });
}
