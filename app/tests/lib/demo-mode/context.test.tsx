import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { DemoModeProvider, useDemoMode } from '@/lib/demo-mode/context';

function ModeProbe() {
  const mode = useDemoMode();
  return <div data-testid="probe">{mode}</div>;
}

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue(
    new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
  ) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
});

describe('DemoModeProvider', () => {
  it('exposes the mode via useDemoMode', () => {
    const { getByTestId } = render(
      <DemoModeProvider mode="live">
        <ModeProbe />
      </DemoModeProvider>,
    );
    expect(getByTestId('probe').textContent).toBe('live');
  });

  it('clickthrough mode does not patch fetch', async () => {
    const before = window.fetch;
    render(
      <DemoModeProvider mode="clickthrough">
        <ModeProbe />
      </DemoModeProvider>,
    );
    expect(window.fetch).toBe(before);
  });

  it('live mode patches fetch to inject x-kanshan-cache-mode header', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('{}'));
    window.fetch = fetchSpy as unknown as typeof window.fetch;

    render(
      <DemoModeProvider mode="live">
        <ModeProbe />
      </DemoModeProvider>,
    );

    await window.fetch('/api/agents/persona-panel', { method: 'POST', body: '{}' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers ?? {});
    expect(headers.get('x-kanshan-cache-mode')).toBe('cache-only');
  });

  it('does not overwrite existing x-kanshan-cache-mode header', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('{}'));
    window.fetch = fetchSpy as unknown as typeof window.fetch;

    render(
      <DemoModeProvider mode="live">
        <ModeProbe />
      </DemoModeProvider>,
    );

    await window.fetch('/api/agents/persona-panel', {
      method: 'POST',
      body: '{}',
      headers: { 'x-kanshan-cache-mode': 'live-only' },
    });
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers ?? {});
    expect(headers.get('x-kanshan-cache-mode')).toBe('live-only');
  });

  it('restores original fetch on unmount', () => {
    const before = window.fetch;
    const { unmount } = render(
      <DemoModeProvider mode="live">
        <ModeProbe />
      </DemoModeProvider>,
    );
    expect(window.fetch).not.toBe(before);
    unmount();
    expect(window.fetch).toBe(before);
  });
});
