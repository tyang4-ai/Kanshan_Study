import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const openTabMock = vi.fn();
vi.mock('@/lib/store/floating-window', () => ({
  useFloatingWindowStore: Object.assign(
    (selector: (s: { openTab: typeof openTabMock }) => unknown) =>
      selector({ openTab: openTabMock }),
    { getState: () => ({ openTab: openTabMock }) },
  ),
}));

import { BulletinTrendCard } from '@/components/rail/BulletinTrendCard';
import { useTrendsGateStore } from '@/lib/store/trends-gate';

beforeEach(() => {
  openTabMock.mockClear();
  window.localStorage.clear();
  useTrendsGateStore.setState({ pending: null });
});
afterEach(() => cleanup());

describe('BulletinTrendCard', () => {
  it('renders the title and meta', () => {
    render(<BulletinTrendCard title="AI 写作工具是否会让答主声音同质化？" meta="热度 8.2万 · 2 小时前" />);
    expect(screen.getByText('AI 写作工具是否会让答主声音同质化？')).toBeInTheDocument();
    expect(screen.getByText('热度 8.2万 · 2 小时前')).toBeInTheDocument();
  });

  it('clicking when not acknowledged pushes to trends-gate store, does not open research', () => {
    render(<BulletinTrendCard title="同质化议题" meta="热度 8.2万 · 2 小时前" />);
    fireEvent.click(screen.getByTestId('bulletin-trend-card'));
    expect(openTabMock).not.toHaveBeenCalled();
    expect(useTrendsGateStore.getState().pending).toEqual({ title: '同质化议题' });
  });

  it('clicking when already acknowledged opens research directly with the title', () => {
    window.localStorage.setItem('kanshan-trends-acknowledged', new Date().toISOString());
    render(<BulletinTrendCard title="同质化议题" meta="热度 8.2万 · 2 小时前" />);
    fireEvent.click(screen.getByTestId('bulletin-trend-card'));
    expect(openTabMock).toHaveBeenCalledTimes(1);
    expect(openTabMock).toHaveBeenCalledWith(
      'research',
      '看水 · 考据卷',
      expect.objectContaining({
        selection: expect.objectContaining({ text: '同质化议题' }),
      }),
    );
    expect(useTrendsGateStore.getState().pending).toBeNull();
  });

  it('Enter key triggers the same gate flow', () => {
    render(<BulletinTrendCard title="键盘触发" meta="meta" />);
    const card = screen.getByTestId('bulletin-trend-card');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(useTrendsGateStore.getState().pending).toEqual({ title: '键盘触发' });
  });
});
