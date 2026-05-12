import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { AutosaveIndicator, formatRelative } from '@/components/editor/AutosaveIndicator';
import { useEditorTabsStore } from '@/lib/store/editor-tabs';

function seed(lastSavedAt: number) {
  useEditorTabsStore.setState({
    docs: {
      a: {
        id: 'a',
        filename: 'x.md',
        htmlContent: '<p></p>',
        lastSavedAt,
        dirty: false,
        source: 'local',
      },
    },
    activeId: 'a',
    hydratedFor: 'me',
  });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('formatRelative', () => {
  it('returns 刚刚 within the first 8 seconds', () => {
    const now = 1_000_000;
    expect(formatRelative(now, now)).toBe('刚刚');
    expect(formatRelative(now, now + 7_500)).toBe('刚刚');
  });
  it('returns N 秒前 between 8s and 60s', () => {
    expect(formatRelative(1_000_000, 1_000_000 + 12_000)).toBe('12 秒前');
  });
  it('returns N 分钟前 between 1m and 1h', () => {
    expect(formatRelative(1_000_000, 1_000_000 + 5 * 60_000)).toBe('5 分钟前');
  });
  it('returns N 小时前 over 1h', () => {
    expect(formatRelative(1_000_000, 1_000_000 + 3 * 60 * 60_000)).toBe('3 小时前');
  });
  it('returns 从未保存 when never saved', () => {
    expect(formatRelative(0, 1_000_000)).toBe('从未保存');
  });
});

describe('AutosaveIndicator', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders 刚刚 immediately after a save', () => {
    seed(Date.now());
    const { getByTestId } = render(<AutosaveIndicator />);
    expect(getByTestId('autosave-indicator').textContent).toMatch(/刚刚/);
  });

  it('renders 从未保存 when lastSavedAt is 0', () => {
    seed(0);
    const { getByTestId } = render(<AutosaveIndicator />);
    expect(getByTestId('autosave-indicator').textContent).toMatch(/从未保存/);
  });

  it('updates as time passes (every 5s interval)', () => {
    vi.useFakeTimers();
    const t0 = Date.now();
    seed(t0);
    const { getByTestId } = render(<AutosaveIndicator />);
    expect(getByTestId('autosave-indicator').textContent).toMatch(/刚刚/);
    act(() => {
      vi.setSystemTime(t0 + 12_000);
      vi.advanceTimersByTime(5_000);
    });
    expect(getByTestId('autosave-indicator').textContent).toMatch(/秒前/);
  });
});
