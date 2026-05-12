import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, waitFor } from '@testing-library/react';
import { AuthErrorToast } from '@/components/chrome/AuthErrorToast';
import { useAiErrorStore } from '@/lib/store/ai-error';
import { useZhihuSessionStore } from '@/lib/store/zhihu-session';

function setUrl(search: string): void {
  const u = new URL('http://localhost/' + search);
  window.history.replaceState(null, '', u.pathname + u.search);
}

describe('AuthErrorToast', () => {
  beforeEach(() => {
    useAiErrorStore.setState({ current: null });
    useZhihuSessionStore.setState({
      uid: null, fullname: null, avatarPath: null, exp: null, hydrated: false,
    });
    setUrl('');
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    setUrl('');
  });

  it('?auth=success → success toast fired + params stripped', async () => {
    act(() => {
      useZhihuSessionStore.getState().set({
        uid: 1, fullname: '小明', avatarPath: null, exp: Date.now() + 60000,
      });
    });
    setUrl('?auth=success');
    render(<AuthErrorToast />);
    await waitFor(() => {
      expect(useAiErrorStore.getState().current?.message).toContain('已成功连接知乎账号');
    });
    expect(useAiErrorStore.getState().current?.message).toContain('小明');
    expect(window.location.search).toBe('');
  });

  it('?auth_error=state_mismatch → locked message', async () => {
    setUrl('?auth_error=state_mismatch');
    render(<AuthErrorToast />);
    await waitFor(() => {
      expect(useAiErrorStore.getState().current?.message).toBe(
        '登录失败 — 状态校验未通过，请重试',
      );
    });
    expect(window.location.search).toBe('');
  });

  it('?auth_error=token_exchange_failed → locked message', async () => {
    setUrl('?auth_error=token_exchange_failed');
    render(<AuthErrorToast />);
    await waitFor(() => {
      expect(useAiErrorStore.getState().current?.message).toBe(
        '登录失败 — 知乎拒绝了授权码',
      );
    });
  });

  it('?auth_error=userinfo_failed → locked message', async () => {
    setUrl('?auth_error=userinfo_failed');
    render(<AuthErrorToast />);
    await waitFor(() => {
      expect(useAiErrorStore.getState().current?.message).toBe(
        '登录失败 — 无法获取你的知乎资料',
      );
    });
  });

  it('no auth params → no toast', () => {
    setUrl('?foo=bar');
    render(<AuthErrorToast />);
    expect(useAiErrorStore.getState().current).toBeNull();
    expect(window.location.search).toBe('?foo=bar');
  });
});
