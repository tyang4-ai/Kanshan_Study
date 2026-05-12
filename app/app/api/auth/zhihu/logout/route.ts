// Phase #15.10 Track 3 (2026-05-11): session clear. Wipes the signed
// kanshan-zhihu-session cookie. No upstream call — 知乎 doesn't document a
// revoke endpoint, and we don't store the access_token after user-info fetch.
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(): Promise<Response> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('kanshan-zhihu-session', '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
}
