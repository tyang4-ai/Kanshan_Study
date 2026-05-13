// Phase #15.10 Track 3 (2026-05-11): OAuth authorize-redirect handler.
// 知乎 OAuth credentials are optional — if any are missing we return 503 at
// request time (not module load) so cache-only / no-OAuth deploys keep
// working. Authorize URL not in the captured spec; default to the public
// 知乎 OAuth page, env-overridable via ZHIHU_OAUTH_AUTHORIZE_URL.
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';

export const runtime = 'nodejs';

const STATE_COOKIE = 'kanshan-oauth-state';
const STATE_MAX_AGE_SECONDS = 600;

export async function GET(req: NextRequest): Promise<Response> {
  const appId = process.env.ZHIHU_OAUTH_APP_ID;
  const redirectUri = process.env.ZHIHU_OAUTH_REDIRECT_URI;
  if (!appId || !redirectUri) {
    return NextResponse.json(
      { error: 'OAuth 未配置 — 缺少 ZHIHU_OAUTH_APP_ID 等环境变量' },
      { status: 503 },
    );
  }

  // r4 2026-05-12: captured spec from
  // www.zhihu.com/ring/moltbook/api/oauth/oauth_quickstart says authorize URL
  // is `https://openapi.zhihu.com/authorize` (NOT `www.zhihu.com/oauth/...`).
  // Our earlier default was a guess and returned 500 from 知乎's side.
  const authorizeUrl =
    process.env.ZHIHU_OAUTH_AUTHORIZE_URL || 'https://openapi.zhihu.com/authorize';

  // Defence-in-depth: even with a compromised env we will not redirect users
  // off the zhihu.com domain. Stops a poisoned ZHIHU_OAUTH_AUTHORIZE_URL from
  // becoming an open-redirect / credential-phishing vector.
  try {
    const host = new URL(authorizeUrl).hostname;
    if (host !== 'zhihu.com' && !host.endsWith('.zhihu.com')) {
      return NextResponse.json({ error: 'invalid authorize host' }, { status: 503 });
    }
  } catch {
    return NextResponse.json({ error: 'malformed authorize URL' }, { status: 503 });
  }

  const state = randomBytes(16).toString('hex');
  // r4 2026-05-12: param name is `app_id`, NOT `client_id` (per the same
  // captured spec). 知乎 returns 500 if `client_id` is used.
  const url =
    `${authorizeUrl}` +
    `?app_id=${encodeURIComponent(appId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&state=${state}`;

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: STATE_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  if (req.nextUrl.searchParams.get('debug') === '1') {
    return NextResponse.json({ authorizeUrl: url, state });
  }

  return NextResponse.redirect(url, 302);
}
