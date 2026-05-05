import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act, cleanup } from '@testing-library/react';
import { NextBeatHint } from '@/components/live/NextBeatHint';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('NextBeatHint', () => {
  it('renders the first beat by default', () => {
    const { getByTestId } = render(<NextBeatHint />);
    const el = getByTestId('next-beat-hint');
    expect(el.getAttribute('data-beat-idx')).toBe('0');
    expect(el.textContent).toContain('0:00');
  });

  it('arrow-right advances to next beat, arrow-left retreats', () => {
    const { getByTestId } = render(<NextBeatHint />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(getByTestId('next-beat-hint').getAttribute('data-beat-idx')).toBe('1');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(getByTestId('next-beat-hint').getAttribute('data-beat-idx')).toBe('2');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(getByTestId('next-beat-hint').getAttribute('data-beat-idx')).toBe('1');
  });

  it('clamps at first and last beats', () => {
    const { getByTestId } = render(<NextBeatHint initialIdx={0} />);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(getByTestId('next-beat-hint').getAttribute('data-beat-idx')).toBe('0');
    // Advance through to the end (7 beats total)
    for (let i = 0; i < 12; i++) {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
    }
    expect(getByTestId('next-beat-hint').getAttribute('data-beat-idx')).toBe('6');
  });

  it('final beat shows fin marker', () => {
    const { getByTestId } = render(<NextBeatHint initialIdx={6} />);
    expect(getByTestId('next-beat-hint').textContent).toContain('fin');
  });

  it('autoAdvance fires after the gap to the next beat', () => {
    const { getByTestId } = render(<NextBeatHint initialIdx={0} autoAdvance />);
    expect(getByTestId('next-beat-hint').getAttribute('data-beat-idx')).toBe('0');
    // Beat 0 → 1 has a 30s gap (0 → 30)
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(getByTestId('next-beat-hint').getAttribute('data-beat-idx')).toBe('1');
  });
});
