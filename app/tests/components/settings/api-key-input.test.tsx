import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { ApiKeyInput } from '@/components/settings/ApiKeyInput';

const STORAGE_KEY = 'kanshan-onboarding';
const TOUR_KEY = 'kanshan-tour-done';

describe('ApiKeyInput', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders status line', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: 'guest', dismissedAt: '2026-05-04T00:00:00.000Z' }),
    );
    const { getByTestId } = render(<ApiKeyInput />);
    const status = getByTestId('api-key-status');
    expect(status.textContent).toContain('mode: guest');
  });

  it('shows masked key when in byo-key mode', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: 'byo-key', apiKey: 'sk-abcdefghijklmnop1234', dismissedAt: '2026-05-04T00:00:00.000Z' }),
    );
    const { getByTestId } = render(<ApiKeyInput />);
    const status = getByTestId('api-key-status');
    expect(status.textContent).toContain('mode: byo-key');
    expect(status.textContent).not.toContain('sk-abcdefghijklmnop1234');
  });

  it('click reopen with confirm=true clears localStorage and tour', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: 'byo-key', apiKey: 'sk-abcdefghijklmnop1234', dismissedAt: '2026-05-04T00:00:00.000Z' }),
    );
    window.localStorage.setItem(TOUR_KEY, 'true');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    // Mock reload to a no-op so jsdom doesn't blow up.
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    });

    const { getByTestId } = render(<ApiKeyInput />);
    fireEvent.click(getByTestId('api-key-reopen'));

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(TOUR_KEY)).toBeNull();
    expect(reloadMock).toHaveBeenCalled();
  });

  it('click reopen with confirm=false does NOT clear localStorage', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mode: 'byo-key', apiKey: 'sk-abcdefghijklmnop1234', dismissedAt: '2026-05-04T00:00:00.000Z' }),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const { getByTestId } = render(<ApiKeyInput />);
    fireEvent.click(getByTestId('api-key-reopen'));

    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});
