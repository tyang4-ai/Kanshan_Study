// Phase #15.10 Track 3 (2026-05-11): session inspector. Returns the verified
// payload from the signed kanshan-zhihu-session cookie, or 401 if missing /
// tampered / expired.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/cookie-sign';

export const runtime = 'nodejs';

interface SessionPayload {
  // String — zhihu UIDs are 19-digit snowflakes that overflow Number precision.
  uid: string;
  fullname: string;
  avatarPath: string | null;
  // Server-only: present in the signed cookie so OAuth-bearer routes can use
  // it; explicitly stripped before returning to the client below.
  accessToken?: string;
  exp: number;
}

export async function GET(): Promise<Response> {
  const sessionSecret = process.env.KANSHAN_SESSION_SECRET;
  const cookieStore = await cookies();
  const token = cookieStore.get('kanshan-zhihu-session')?.value;

  if (!sessionSecret || !token) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  const payload = verifySession<SessionPayload>(token, sessionSecret);
  if (!payload) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  // Strip the access_token before returning — clients have no reason to see it
  // and exposing it would let any in-browser script post to 知乎 on the user's
  // behalf without going through our rate-limited routes.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { accessToken: _drop, ...safe } = payload;
  return NextResponse.json(safe);
}
