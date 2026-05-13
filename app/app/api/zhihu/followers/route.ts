// Server proxy for the 知乎 followers list (§11 of the captured spec).
// Reads the user's access_token from the signed session cookie and forwards
// the call. When the user isn't OAuth'd we return an empty list — no
// fixture for follower data because it's real-user-specific and faking it
// would be actively misleading in the UI.

import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/cookie-sign';
import { getFollowers, getFollowed } from '@/lib/zhihu';

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

export async function GET(req: NextRequest): Promise<NextResponse> {
  const accessToken = await getAccessToken();
  const page = Number(req.nextUrl.searchParams.get('page') ?? 0);
  const perPage = Math.min(50, Number(req.nextUrl.searchParams.get('per_page') ?? 10));
  try {
    const [followers, followed] = await Promise.all([
      getFollowers(accessToken, page, perPage),
      // Also return who-I-follow in the same call so the UI can render both
      // halves of a 「关注/粉丝」 pair without two round-trips.
      getFollowed(accessToken, page, perPage),
    ]);
    return NextResponse.json({
      followers,
      followed,
      followerCount: followers.length,
      followedCount: followed.length,
      source: accessToken && process.env.ZHIHU_API_MODE === 'real' ? 'live' : 'mock',
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message, followers: [], followed: [] },
      { status: 502 },
    );
  }
}
