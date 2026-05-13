// OAuth callback handler.
//
// 知乎's OAuth implementation diverges from RFC 6749 / common patterns in
// several places (confirmed via network capture 2026-05-13):
//   • Redirect query param is `authorization_code`, not `code`.
//   • `state` we sent on /authorize is NOT echoed back — can't do RFC state-match.
//   • Token exchange + userinfo response shapes are not yet captured live;
//     we accept both snake_case and PascalCase / wrapped forms.
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
  uid: number;
  fullname: string;
  avatarPath: string | null;
  exp: number;
}

function clipForUrl(s: string, maxLen = 280): string {
  const clipped = s.slice(0, maxLen);
  // base64url so the body survives URLSearchParams round-trip without
  // collisions on `+ / =`. Falls back to a plain encodeURIComponent if
  // the buffer-encode itself ever throws.
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

/**
 * Unwraps the layered response shapes 知乎 uses, in priority order:
 *   1. Top-level snake_case (`{access_token, ...}`) — RFC 6749 style.
 *   2. Top-level PascalCase (`{AccessToken, ...}`) — observed on /api/v1/content/*.
 *   3. Wrapped `{Code: 0, Data: {...}}` — observed on /api/v1/content/*.
 *   4. Wrapped `{code: 0, data: {...}}` — observed on /community/*.
 *   5. Wrapped `{status: 0, data: {...}}` — observed on /community/*.
 * Returns the unwrapped inner object (or the top-level object as fallback).
 */
function unwrapPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  // Error envelope first — bail with the message.
  if (obj.error && typeof obj.error === 'object') {
    return obj.error as Record<string, unknown>;
  }
  // Wrapped {Code, Data} / {code, data} / {status, data}
  for (const dataKey of ['Data', 'data']) {
    if (obj[dataKey] && typeof obj[dataKey] === 'object') {
      const inner = obj[dataKey] as Record<string, unknown>;
      // Only unwrap if the outer envelope looks like a status wrapper —
      // otherwise we'd lose meaningful top-level data fields.
      if ('Code' in obj || 'code' in obj || 'status' in obj || 'msg' in obj || 'message' in obj || 'Message' in obj) {
        return inner;
      }
    }
  }
  return obj;
}

/** First defined string-value among a list of candidate keys (case-permissive). */
function pickString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
  }
  return null;
}

interface TokenResult {
  accessToken: string;
}

async function exchangeCodeForToken(
  appId: string,
  appKey: string,
  redirectUri: string,
  code: string,
): Promise<{ ok: true; result: TokenResult } | { ok: false; detail: string }> {
  // 知乎 returned the code under the field name `authorization_code` in the
  // redirect. They may expect the same name in the exchange body — send both
  // (the unused one is ignored). Form-encoded per RFC 6749.
  const body = new URLSearchParams({
    app_id: appId,
    client_id: appId, // RFC 6749 standard name — defensive
    app_key: appKey,
    client_secret: appKey, // RFC 6749 standard name — defensive
    grant_type: 'authorization_code',
    code,
    authorization_code: code, // 知乎-specific naming, mirroring redirect param
    redirect_uri: redirectUri,
  });

  // Try a small list of plausible endpoints; first one that returns a
  // parseable access_token wins. The captured spec hasn't been re-verified
  // for OAuth so we cover the most common variants.
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
      try { parsed = JSON.parse(text); } catch { /* keep parsed as null */ }
      const inner = parsed ? unwrapPayload(parsed) : {};
      const accessToken = pickString(
        inner,
        'access_token',
        'AccessToken',
        'accessToken',
      );
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
  uid: number;
  fullname: string;
  avatarPath: string | null;
}

async function fetchUserInfo(
  accessToken: string,
): Promise<{ ok: true; result: UserResult } | { ok: false; detail: string }> {
  // 知乎's userinfo endpoint hasn't been captured live; try the documented
  // forms. First successful parse wins.
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
      try { parsed = JSON.parse(text); } catch { /* keep parsed as null */ }
      const inner = parsed ? unwrapPayload(parsed) : {};
      const uid = pickNumber(inner, 'uid', 'UID', 'user_id', 'UserID', 'id');
      const fullname = pickString(inner, 'fullname', 'Fullname', 'name', 'Name', 'nick', 'Nickname', 'username');
      const avatarPath = pickString(
        inner,
        'avatar_path', 'AvatarPath', 'avatar', 'Avatar', 'avatar_url', 'AvatarURL', 'headimg',
      );
      if (res.ok && uid !== null && fullname) {
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
