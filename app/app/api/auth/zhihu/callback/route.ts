// Phase #15.10 Track 3 (2026-05-11): OAuth callback handler. Verifies state,
// exchanges code → access_token (form-encoded POST per the captured spec),
// fetches /user (Bearer auth), extracts PII-minimized `{uid, fullname,
// avatar_path}`, signs into the kanshan-zhihu-session cookie, redirects to
// `/?auth=success`. On any error, redirects to `/?auth_error=<reason>`.
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { signSession } from '@/lib/auth/cookie-sign';

export const runtime = 'nodejs';

const STATE_COOKIE = 'kanshan-oauth-state';
const SESSION_COOKIE = 'kanshan-zhihu-session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 3600;

interface TokenResponse {
  access_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
}

interface UserResponse {
  uid?: unknown;
  fullname?: unknown;
  avatar_path?: unknown;
}

interface SessionPayload {
  uid: number;
  fullname: string;
  avatarPath: string | null;
  exp: number;
}

function redirectWithError(req: NextRequest, code: string): NextResponse {
  const target = new URL(`/?auth_error=${encodeURIComponent(code)}`, req.url);
  const res = NextResponse.redirect(target);
  // Always clear the state cookie on error so a stale value can't lock the
  // user out of subsequent attempts.
  res.cookies.set(STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
}

export async function GET(req: NextRequest): Promise<Response> {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const cookieStore = await cookies();
  const cookieState = cookieStore.get(STATE_COOKIE)?.value ?? null;

  if (!code || !state || !cookieState || state !== cookieState) {
    return redirectWithError(req, 'state_mismatch');
  }

  const appId = process.env.ZHIHU_OAUTH_APP_ID;
  const appKey = process.env.ZHIHU_OAUTH_APP_KEY;
  const redirectUri = process.env.ZHIHU_OAUTH_REDIRECT_URI;
  if (!appId || !appKey || !redirectUri) {
    return redirectWithError(req, 'oauth_not_configured');
  }

  // Exchange code → access_token (form-encoded per spec)
  const tokenBody =
    `app_id=${encodeURIComponent(appId)}` +
    `&app_key=${encodeURIComponent(appKey)}` +
    `&grant_type=authorization_code` +
    `&code=${encodeURIComponent(code)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  let accessToken: string | null = null;
  try {
    const tokenRes = await fetch('https://openapi.zhihu.com/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    });
    if (!tokenRes.ok) return redirectWithError(req, 'token_exchange_failed');
    const tokenJson = (await tokenRes.json()) as TokenResponse;
    if (typeof tokenJson.access_token !== 'string' || !tokenJson.access_token) {
      return redirectWithError(req, 'token_exchange_failed');
    }
    accessToken = tokenJson.access_token;
  } catch {
    return redirectWithError(req, 'token_exchange_failed');
  }

  // Fetch user info (Bearer auth)
  let userInfo: { uid: number; fullname: string; avatarPath: string | null };
  try {
    const userRes = await fetch('https://openapi.zhihu.com/user', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) return redirectWithError(req, 'userinfo_failed');
    const userJson = (await userRes.json()) as UserResponse;
    if (typeof userJson.uid !== 'number' || typeof userJson.fullname !== 'string') {
      return redirectWithError(req, 'userinfo_failed');
    }
    userInfo = {
      uid: userJson.uid,
      fullname: userJson.fullname,
      avatarPath: typeof userJson.avatar_path === 'string' ? userJson.avatar_path : null,
    };
  } catch {
    return redirectWithError(req, 'userinfo_failed');
  }

  const sessionSecret = process.env.KANSHAN_SESSION_SECRET;
  if (!sessionSecret) {
    return redirectWithError(req, 'session_secret_missing');
  }

  const payload: SessionPayload = {
    uid: userInfo.uid,
    fullname: userInfo.fullname,
    avatarPath: userInfo.avatarPath,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const signed = signSession(payload, sessionSecret);

  const success = new URL('/?auth=success', req.url);
  const res = NextResponse.redirect(success);
  res.cookies.set(SESSION_COOKIE, signed, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  // Clear the state cookie now that the handshake is complete.
  res.cookies.set(STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
}
