'use client';
// Reads `?auth=...` / `?auth_error=...` / `?auth_detail=...` params from the
// URL after the zhihu OAuth callback, dispatches a toast via `useAiErrorStore`,
// then strips the params. `auth_detail` is the base64url-encoded body the
// callback captured from 知乎's actual error response — surfaces it in the
// toast so we can see exactly what diverged without server logs.

import { useEffect } from 'react';
import { useAiErrorStore } from '@/lib/store/ai-error';
import { useZhihuSessionStore } from '@/lib/store/zhihu-session';

const ERROR_MESSAGES: Record<string, string> = {
  no_code: '登录失败 — 知乎未返回授权码',
  no_state_cookie: '登录失败 — 会话已过期，请重试',
  state_mismatch: '登录失败 — 状态校验未通过，请重试',
  token_exchange_failed: '登录失败 — 知乎拒绝了授权码',
  userinfo_failed: '登录失败 — 无法获取你的知乎资料',
  session_secret_missing: '登录失败 — 服务端未配置 KANSHAN_SESSION_SECRET',
  oauth_not_configured: '登录失败 — 服务端缺少 OAuth 配置',
};

function decodeDetail(raw: string | null): string | null {
  if (!raw) return null;
  try {
    // base64url → base64 → utf8
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    return atob(padded + pad);
  } catch {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
}

function stripAuthParams(): void {
  if (typeof window === 'undefined') return;
  const u = new URL(window.location.href);
  u.searchParams.delete('auth');
  u.searchParams.delete('auth_error');
  u.searchParams.delete('auth_detail');
  window.history.replaceState(null, '', u.toString());
}

export function AuthErrorToast(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    const err = params.get('auth_error');
    const detail = decodeDetail(params.get('auth_detail'));

    if (!auth && !err) return;

    const push = useAiErrorStore.getState().push;

    if (auth === 'success') {
      const announce = (): void => {
        const fn = useZhihuSessionStore.getState().fullname;
        push({ message: `已成功连接知乎账号 · 欢迎，${fn ?? ''}` });
      };
      const fn = useZhihuSessionStore.getState().fullname;
      if (fn) {
        announce();
      } else {
        void useZhihuSessionStore.getState().hydrate().then(announce);
      }
      stripAuthParams();
      return;
    }

    if (err) {
      const baseMessage = ERROR_MESSAGES[err] ?? `登录失败 — ${err}`;
      const message = detail ? `${baseMessage}\n${detail}` : baseMessage;
      push({ message });
      // Also surface the raw detail to the dev console so a long error body
      // doesn't get truncated by the small toast.
      // eslint-disable-next-line no-console
      if (detail) console.warn('[oauth]', err, detail);
      stripAuthParams();
    }
  }, []);

  return null;
}
