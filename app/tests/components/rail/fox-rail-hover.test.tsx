import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FoxRail } from '@/components/atoms/FoxRail';
import { useDailyFoxPulseStore } from '@/lib/store/daily-fox-pulse';

describe('FoxRail hover wiring', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useDailyFoxPulseStore.setState({ glowingFox: null });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mouseEnter then 300ms idle reveals the guide card', () => {
    render(<FoxRail activeIds={['mo']} onPick={() => {}} />);
    const btn = screen.getByTitle(/刘看典/);
    act(() => {
      fireEvent.mouseEnter(btn);
    });
    expect(screen.queryByTestId('fox-guide-card')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(310);
    });
    const card = screen.getByTestId('fox-guide-card');
    expect(card.getAttribute('data-fox-id')).toBe('dian');
  });

  it('mouseLeave before 300ms cancels the open and no card appears', () => {
    render(<FoxRail activeIds={['mo']} onPick={() => {}} />);
    const btn = screen.getByTitle(/刘看势/);
    act(() => {
      fireEvent.mouseEnter(btn);
      vi.advanceTimersByTime(150);
      fireEvent.mouseLeave(btn);
      vi.advanceTimersByTime(400);
    });
    expect(screen.queryByTestId('fox-guide-card')).toBeNull();
  });

  it('mouseLeave after card opens schedules close after 150ms', () => {
    render(<FoxRail activeIds={['mo']} onPick={() => {}} />);
    const btn = screen.getByTitle(/刘看水/);
    act(() => {
      fireEvent.mouseEnter(btn);
      vi.advanceTimersByTime(310);
    });
    expect(screen.getByTestId('fox-guide-card')).toBeInTheDocument();
    act(() => {
      fireEvent.mouseLeave(btn);
      vi.advanceTimersByTime(160);
    });
    expect(screen.queryByTestId('fox-guide-card')).toBeNull();
  });

  it('click on a fox button still toggles active fox (existing behavior intact)', () => {
    const onPick = vi.fn();
    render(<FoxRail activeIds={['mo']} onPick={onPick} />);
    fireEvent.click(screen.getByTitle(/刘看文 ·/));
    expect(onPick).toHaveBeenCalledWith('wen');
  });

  it('still renders 9 buttons', () => {
    render(<FoxRail activeIds={['mo']} onPick={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(9);
  });
});
