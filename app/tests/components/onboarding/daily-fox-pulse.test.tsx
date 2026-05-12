import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { DailyFoxPulse } from '@/components/onboarding/DailyFoxPulse';
import { useAccountStore } from '@/lib/store/account';
import { useDailyFoxPulseStore } from '@/lib/store/daily-fox-pulse';

const LS_KEY_PREFIX = 'kanshan-fox-pulse-seen:';

describe('DailyFoxPulse', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    useAccountStore.setState({ active: 'me' });
    useDailyFoxPulseStore.setState({ glowingFox: null });
  });
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('first mount with no LS key renders caption + sets LS key after cycle (3.2s)', () => {
    render(<DailyFoxPulse />);
    expect(screen.getByTestId('daily-fox-pulse-caption')).toBeInTheDocument();
    expect(localStorage.getItem(`${LS_KEY_PREFIX}me`)).toBeNull();

    // Run through full 4×800ms cycle
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(useDailyFoxPulseStore.getState().glowingFox).toBe('dian');
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(useDailyFoxPulseStore.getState().glowingFox).toBe('mo');
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(useDailyFoxPulseStore.getState().glowingFox).toBe('shui');
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(useDailyFoxPulseStore.getState().glowingFox).toBeNull();
    expect(localStorage.getItem(`${LS_KEY_PREFIX}me`)).toBe('1');
    expect(screen.queryByTestId('daily-fox-pulse-caption')).toBeNull();
  });

  it('renders nothing when LS key already set', () => {
    localStorage.setItem(`${LS_KEY_PREFIX}me`, '1');
    render(<DailyFoxPulse />);
    expect(screen.queryByTestId('daily-fox-pulse-caption')).toBeNull();
  });

  it('account switch (me → guwanxi) → guwanxi sees its own first-visit cycle', () => {
    // me has already seen.
    localStorage.setItem(`${LS_KEY_PREFIX}me`, '1');
    render(<DailyFoxPulse />);
    expect(screen.queryByTestId('daily-fox-pulse-caption')).toBeNull();

    // Switch to guwanxi — no LS key for that account yet → cycle should fire.
    act(() => {
      useAccountStore.setState({ active: 'guwanxi' });
    });
    expect(screen.getByTestId('daily-fox-pulse-caption')).toBeInTheDocument();
    expect(localStorage.getItem(`${LS_KEY_PREFIX}guwanxi`)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(4 * 800);
    });
    expect(localStorage.getItem(`${LS_KEY_PREFIX}guwanxi`)).toBe('1');
  });

  it('user click during cycle ends pulse immediately + sets LS key', () => {
    render(<DailyFoxPulse />);
    expect(screen.getByTestId('daily-fox-pulse-caption')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(screen.queryByTestId('daily-fox-pulse-caption')).toBeNull();
    expect(useDailyFoxPulseStore.getState().glowingFox).toBeNull();
    expect(localStorage.getItem(`${LS_KEY_PREFIX}me`)).toBe('1');
  });
});
