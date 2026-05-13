// Server proxy for the 知乎 following-feed endpoint. Reads the user's
// access_token from the signed session cookie (server-only — /me strips it
// before responding), calls getFollowingFeed with the token, returns the
// normalised FeedPage. When the user isn't logged in we fall through to the
// mock fixture so the TrendsTab "我关注的人" section still has something to
// render.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/cookie-sign';
import { getFollowingFeed } from '@/lib/zhihu';

export const runtime = 'nodejs';

interface SessionPayload {
  uid: string;
  fullname: string;
  avatarPath: string | null;
  accessToken?: string;
  exp: number;
}

async function getAccessToken(): Promise<string | undefined> {
  const secret = process.env.KANSHAN_SESSION_SECRET;
  if (!secret) return undefined;
  const jar = await cookies();
  const token = jar.get('kanshan-zhihu-session')?.value;
  if (!token) return undefined;
  const payload = verifySession<SessionPayload>(token, secret);
  return payload?.accessToken;
}

export async function GET(): Promise<NextResponse> {
  try {
    const accessToken = await getAccessToken();
    const page = await getFollowingFeed(accessToken);
    const source =
      process.env.ZHIHU_API_MODE === 'real' && accessToken
        ? 'live'
        : 'mock';
    return NextResponse.json({ page, source });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message, page: { items: [], cursor: null } },
      { status: 502 },
    );
  }
}
