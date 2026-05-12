'use client';
// Track #15.10 — headless side-effect component. Reads `?auth=...` /
// `?auth_error=...` params from the URL after the zhihu OAuth callback,
// dispatches a toast via `useAiErrorStore`, then strips the params.

import { useEffect } from 'react';
import { useAiErrorStore } from '@/lib/store/ai-error';
import { useZhihuSessionStore } from '@/lib/store/zhihu-session';

const ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: '登录失败 — 状态校验未通过，请重试',
  token_exchange_failed: '登录失败 — 知乎拒绝了授权码',
  userinfo_failed: '登录失败 — 无法获取你的知乎资料',
  session_secret_missing: '登录失败 — 服务端未配置 KANSHAN_SESSION_SECRET',
};

function stripAuthParams(): void {
  if (typeof window === 'undefined') return;
  const u = new URL(window.location.href);
  u.searchParams.delete('auth');
  u.searchParams.delete('auth_error');
  window.history.replaceState(null, '', u.toString());
}

export function AuthErrorToast(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    const err = params.get('auth_error');

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
      const message = ERROR_MESSAGES[err] ?? `登录失败 — ${err}`;
      push({ message });
      stripAuthParams();
    }
  }, []);

  return null;
}
