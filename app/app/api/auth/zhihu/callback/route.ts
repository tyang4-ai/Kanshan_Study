// OAuth callback handler.
//
// 知乎's OAuth implementation diverges from RFC 6749 / common patterns in
// several places (confirmed via network capture 2026-05-13):
//   • Redirect query param is `authorization_code`, not `code`.
//   • `state` we sent on /authorize is NOT echoed back — can't do RFC state-match.
//   • UID is a 19-digit snowflake (>2^53). JSON.parse rounds it. We extract it
//     as a string from the raw response text before any number coercion.
//
// This handler is intentionally over-defensive: every parsing branch logs the
// observed response back into the error redirect URL (base64-encoded body
// snippet) so a failed login surfaces the actual divergence in the toast
// instead of a generic "token_exchange_failed".

import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { signSession } from '@/lib/auth/cookie-sign';

export const runtime = 'nodejs';

const STATE_COOKIE = 'kanshan-oauth-state';
const SESSION_COOKIE = 'kanshan-zhihu-session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 3600;

interface SessionPayload {
  // String — 知乎 UIDs are 19-digit snowflakes that overflow Number precision.
  uid: string;
  fullname: string;
  avatarPath: string | null;
  exp: number;
}

function clipForUrl(s: string, maxLen = 280): string {
  const clipped = s.slice(0, maxLen);
  try {
    return Buffer.from(clipped, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch {
    return encodeURIComponent(clipped);
  }
}

function redirectWithError(req: NextRequest, code: string, detail?: string): NextResponse {
  const params = new URLSearchParams({ auth_error: code });
  if (detail) params.set('auth_detail', clipForUrl(detail));
  const target = new URL(`/?${params.toString()}`, req.url);
  const res = NextResponse.redirect(target);
  res.cookies.set(STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
}

function unwrapPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  if (obj.error && typeof obj.error === 'object') {
    return obj.error as Record<string, unknown>;
  }
  for (const dataKey of ['Data', 'data']) {
    if (obj[dataKey] && typeof obj[dataKey] === 'object') {
      const inner = obj[dataKey] as Record<string, unknown>;
      if ('Code' in obj || 'code' in obj || 'status' in obj || 'msg' in obj || 'message' in obj || 'Message' in obj) {
        return inner;
      }
    }
  }
  return obj;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return null;
}

/**
 * Extracts a digits-only field from a raw JSON text body before JSON.parse
 * can coerce it to a Number (and round 19-digit snowflakes). Falls back to
 * pulling from the parsed object if the regex misses (e.g. nested).
 *
 * `keys` are tried in order — first hit wins.
 */
function pickBigIntString(rawText: string, parsed: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    // Match `"key": 12345...` (number form) or `"key": "12345..."` (string form).
    const re = new RegExp(`"${k}"\\s*:\\s*"?(\\d+)"?`);
    const m = rawText.match(re);
    if (m && m[1]) return m[1];
  }
  // Fallback: parsed value (loses precision for big numbers but better than null).
  for (const k of keys) {
    const v = parsed[k];
    if (typeof v === 'string' && /^\d+$/.test(v)) return v;
    if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  }
  return null;
}

interface TokenResult { accessToken: string; }

async function exchangeCodeForToken(
  appId: string,
  appKey: string,
  redirectUri: string,
  code: string,
): Promise<{ ok: true; result: TokenResult } | { ok: false; detail: string }> {
  const body = new URLSearchParams({
    app_id: appId,
    client_id: appId,
    app_key: appKey,
    client_secret: appKey,
    grant_type: 'authorization_code',
    code,
    authorization_code: code,
    redirect_uri: redirectUri,
  });

  const endpoints = [
    'https://openapi.zhihu.com/access_token',
    'https://openapi.zhihu.com/oauth/access_token',
    'https://openapi.zhihu.com/oauth/token',
  ];

  let lastDetail = 'no endpoint reachable';
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(8000),
      });
      const text = await res.text();
      let parsed: unknown = null;
      try { parsed = JSON.parse(text); } catch { /* keep null */ }
      const inner = parsed ? unwrapPayload(parsed) : {};
      const accessToken = pickString(inner, 'access_token', 'AccessToken', 'accessToken');
      if (res.ok && accessToken) {
        return { ok: true, result: { accessToken } };
      }
      lastDetail = `${new URL(url).pathname} → ${res.status} ${text.slice(0, 200)}`;
    } catch (err) {
      lastDetail = `${new URL(url).pathname} → fetch threw: ${(err as Error).message}`;
    }
  }
  return { ok: false, detail: lastDetail };
}

interface UserResult {
  uid: string;
  fullname: string;
  avatarPath: string | null;
}

async function fetchUserInfo(
  accessToken: string,
): Promise<{ ok: true; result: UserResult } | { ok: false; detail: string }> {
  const endpoints = [
    'https://openapi.zhihu.com/user',
    'https://openapi.zhihu.com/me',
    'https://openapi.zhihu.com/oauth/user',
  ];

  let lastDetail = 'no endpoint reachable';
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      });
      const text = await res.text();
      let parsed: unknown = null;
      try { parsed = JSON.parse(text); } catch { /* keep null */ }
      const inner = parsed ? unwrapPayload(parsed) : {};
      // UID is a 19-digit snowflake — extract from raw text to keep precision.
      const uid = pickBigIntString(text, inner, 'uid', 'UID', 'user_id', 'UserID', 'id');
      const fullname = pickString(inner, 'fullname', 'Fullname', 'name', 'Name', 'nick', 'Nickname', 'username');
      const avatarPath = pickString(
        inner,
        'avatar_path', 'AvatarPath', 'avatar', 'Avatar', 'avatar_url', 'AvatarURL', 'headimg',
      );
      if (res.ok && uid && fullname) {
        return { ok: true, result: { uid, fullname, avatarPath } };
      }
      lastDetail = `${new URL(url).pathname} → ${res.status} ${text.slice(0, 200)}`;
    } catch (err) {
      lastDetail = `${new URL(url).pathname} → fetch threw: ${(err as Error).message}`;
    }
  }
  return { ok: false, detail: lastDetail };
}

export async function GET(req: NextRequest): Promise<Response> {
  const code =
    req.nextUrl.searchParams.get('authorization_code') ??
    req.nextUrl.searchParams.get('code');
  const cookieStore = await cookies();
  const cookieState = cookieStore.get(STATE_COOKIE)?.value ?? null;

  if (!code) {
    return redirectWithError(req, 'no_code', 'callback received no authorization_code');
  }
  if (!cookieState) {
    return redirectWithError(req, 'no_state_cookie', 'kanshan-oauth-state cookie missing on callback');
  }

  const appId = process.env.ZHIHU_OAUTH_APP_ID;
  const appKey = process.env.ZHIHU_OAUTH_APP_KEY;
  const redirectUri = process.env.ZHIHU_OAUTH_REDIRECT_URI;
  if (!appId || !appKey || !redirectUri) {
    return redirectWithError(req, 'oauth_not_configured');
  }

  const tokenResult = await exchangeCodeForToken(appId, appKey, redirectUri, code);
  if (!tokenResult.ok) {
    return redirectWithError(req, 'token_exchange_failed', tokenResult.detail);
  }

  const userResult = await fetchUserInfo(tokenResult.result.accessToken);
  if (!userResult.ok) {
    return redirectWithError(req, 'userinfo_failed', userResult.detail);
  }

  const sessionSecret = process.env.KANSHAN_SESSION_SECRET;
  if (!sessionSecret) {
    return redirectWithError(req, 'session_secret_missing');
  }

  const payload: SessionPayload = {
    uid: userResult.result.uid,
    fullname: userResult.result.fullname,
    avatarPath: userResult.result.avatarPath,
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
  res.cookies.set(STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res;
}
