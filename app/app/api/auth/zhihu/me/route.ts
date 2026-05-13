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

  return NextResponse.json(payload);
}
