import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { TypewriterText } from '@/components/persona/TypewriterText';

function mockMatchMedia(reduced: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('TypewriterText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('types out characters one at a time at the configured speed', () => {
    const onComplete = vi.fn();
    render(<TypewriterText text="hello" speed={30} onComplete={onComplete} />);

    const root = screen.getByTestId('typewriter-text');
    expect(root.textContent).toBe('▌');
    expect(screen.getByTestId('typewriter-cursor')).toBeInTheDocument();

    const tick = 1000 / 30;

    act(() => {
      vi.advanceTimersByTime(tick);
    });
    expect(root.textContent).toBe('h▌');

    act(() => {
      vi.advanceTimersByTime(tick * 4);
    });
    expect(root.textContent).toContain('hello');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('resets shown to empty when text prop changes', () => {
    const { rerender } = render(<TypewriterText text="abc" speed={30} />);
    const root = screen.getByTestId('typewriter-text');

    act(() => {
      vi.advanceTimersByTime(1000 / 30);
    });
    expect(root.textContent).toBe('a▌');

    rerender(<TypewriterText text="xyz" speed={30} />);
    expect(root.textContent).toBe('▌');
  });

  it('with reducedMotion={true} prop → shown is full text immediately, no cursor, onComplete fires next tick', () => {
    const onComplete = vi.fn();
    render(
      <TypewriterText
        text="hello"
        speed={30}
        onComplete={onComplete}
        reducedMotion={true}
      />,
    );

    const root = screen.getByTestId('typewriter-text');
    expect(root.textContent).toBe('hello');
    expect(screen.queryByTestId('typewriter-cursor')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('respects matchMedia(prefers-reduced-motion: reduce) when reducedMotion prop unset', () => {
    mockMatchMedia(true);
    const onComplete = vi.fn();
    render(<TypewriterText text="hello" speed={30} onComplete={onComplete} />);

    const root = screen.getByTestId('typewriter-text');
    expect(root.textContent).toBe('hello');
    expect(screen.queryByTestId('typewriter-cursor')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('empty text → onComplete fires; no cursor', () => {
    const onComplete = vi.fn();
    render(<TypewriterText text="" speed={30} onComplete={onComplete} />);

    expect(screen.queryByTestId('typewriter-cursor')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
