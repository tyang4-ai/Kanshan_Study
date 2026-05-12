import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act, waitFor } from '@testing-library/react';
import { ZhihuBadge } from '@/components/chrome/TitleBar';
import { useZhihuSessionStore } from '@/lib/store/zhihu-session';
import { useAiErrorStore } from '@/lib/store/ai-error';

function resetSession(): void {
  useZhihuSessionStore.setState({
    uid: null,
    fullname: null,
    avatarPath: null,
    exp: null,
    hydrated: false,
  });
}

describe('TitleBar · ZhihuBadge', () => {
  beforeEach(() => {
    resetSession();
    useAiErrorStore.setState({ current: null });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders nothing when no session', () => {
    const { queryByTestId } = render(<ZhihuBadge />);
    expect(queryByTestId('zhihu-badge')).toBeNull();
  });

  it('renders badge with 已登录 · 张三 when fullname=张三', () => {
    act(() => {
      useZhihuSessionStore.getState().set({
        uid: 11, fullname: '张三', avatarPath: null, exp: Date.now() + 60000,
      });
    });
    const { getByTestId } = render(<ZhihuBadge />);
    const badge = getByTestId('zhihu-badge');
    expect(badge.textContent).toContain('已登录 · 张三');
  });

  it('truncates long fullname to 6 chars + …', () => {
    act(() => {
      useZhihuSessionStore.getState().set({
        uid: 12, fullname: '这是一个非常长的名字', avatarPath: null, exp: Date.now() + 60000,
      });
    });
    const { getByTestId } = render(<ZhihuBadge />);
    const badge = getByTestId('zhihu-badge');
    expect(badge.textContent).toContain('已登录 · 这是一个非常…');
  });

  it('logout button calls /api/auth/zhihu/logout, clears session, and pushes toast', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    act(() => {
      useZhihuSessionStore.getState().set({
        uid: 13, fullname: '李四', avatarPath: null, exp: Date.now() + 60000,
      });
    });
    const { getByTestId } = render(<ZhihuBadge />);
    fireEvent.click(getByTestId('zhihu-badge'));
    fireEvent.click(getByTestId('zhihu-logout'));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/auth/zhihu/logout', expect.objectContaining({ method: 'POST' }));
    });
    await waitFor(() => {
      expect(useZhihuSessionStore.getState().fullname).toBeNull();
    });
    expect(useAiErrorStore.getState().current?.message).toBe('已退出知乎账号');
  });
});
