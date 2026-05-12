import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, act, waitFor } from '@testing-library/react';
import { SettingsTab } from '@/components/floating/SettingsTab';
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

describe('SettingsTab · 知乎账号 section', () => {
  beforeEach(() => {
    resetSession();
    useAiErrorStore.setState({ current: null });
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('not connected: shows 「连接你的知乎账号 ↗」 button, opens new tab on click', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);
    const { getByTestId } = render(<SettingsTab />);
    const btn = getByTestId('settings-zhihu-connect');
    expect(btn.textContent).toContain('连接你的知乎账号');
    fireEvent.click(btn);
    expect(openSpy).toHaveBeenCalledWith('/api/auth/zhihu/start', '_blank');
  });

  it('connected: shows fullname + uid + 「断开连接」', () => {
    act(() => {
      useZhihuSessionStore.getState().set({
        uid: 999, fullname: '王五', avatarPath: null, exp: Date.now() + 60000,
      });
    });
    const { getByTestId } = render(<SettingsTab />);
    const section = getByTestId('settings-zhihu-section');
    expect(section.textContent).toContain('王五');
    expect(section.textContent).toContain('999');
    expect(getByTestId('settings-zhihu-disconnect')).toBeInTheDocument();
  });

  it('断开连接 calls logout API + clears session + pushes toast', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    act(() => {
      useZhihuSessionStore.getState().set({
        uid: 7, fullname: '赵六', avatarPath: null, exp: Date.now() + 60000,
      });
    });
    const { getByTestId } = render(<SettingsTab />);
    fireEvent.click(getByTestId('settings-zhihu-disconnect'));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/auth/zhihu/logout', expect.objectContaining({ method: 'POST' }));
    });
    await waitFor(() => {
      expect(useZhihuSessionStore.getState().fullname).toBeNull();
    });
    expect(useAiErrorStore.getState().current?.message).toBe('已退出知乎账号');
  });
});
