import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GuestIndicator } from '@/components/chrome/GuestIndicator';

function setCookie(value: string | null) {
  // Reset cookie storage between tests by setting a deletion path.
  // jsdom retains document.cookie across tests within a file.
  Object.defineProperty(document, 'cookie', {
    writable: true,
    configurable: true,
    value: value ?? '',
  });
}

beforeEach(() => {
  setCookie(null);
  window.localStorage.clear();
});

describe('GuestIndicator', () => {
  it('renders nothing when no cookie', () => {
    setCookie('');
    const { container } = render(<GuestIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('renders 受限模式 + first 6 chars of guestId in guest mode', () => {
    setCookie('kanshan-guest-id=abc123def456');
    window.localStorage.setItem('kanshan-onboarding', JSON.stringify({ mode: 'guest' }));
    render(<GuestIndicator />);
    const el = screen.getByTestId('guest-indicator');
    expect(el.textContent).toContain('#abc123');
    expect(el.textContent).toContain('受限模式');
  });

  it('renders 自带密钥 in byo-key mode', () => {
    setCookie('kanshan-guest-id=ffeedd112233');
    window.localStorage.setItem('kanshan-onboarding', JSON.stringify({ mode: 'byo-key' }));
    render(<GuestIndicator />);
    const el = screen.getByTestId('guest-indicator');
    expect(el.textContent).toContain('#ffeedd');
    expect(el.textContent).toContain('自带密钥');
  });

  it('falls back to 受限模式 when localStorage is unset', () => {
    setCookie('kanshan-guest-id=abc123def456');
    render(<GuestIndicator />);
    const el = screen.getByTestId('guest-indicator');
    expect(el.textContent).toContain('受限模式');
  });

  it('survives malformed localStorage JSON without throwing', () => {
    setCookie('kanshan-guest-id=abc123def456');
    window.localStorage.setItem('kanshan-onboarding', 'not-json');
    render(<GuestIndicator />);
    const el = screen.getByTestId('guest-indicator');
    expect(el.textContent).toContain('受限模式');
  });
});
