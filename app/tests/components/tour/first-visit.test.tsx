import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { TourTrigger } from '@/components/tour/TourTrigger';

// First-visit auto-open behavior is encoded in TourTrigger.tsx via two
// localStorage keys (not the spec's mentioned `kanshan-tour-seen`):
//   - `kanshan-onboarding` set by OnboardingGate when the user closes it
//   - `kanshan-tour-done` set by TourEngine.finish() (skip or last-step)
// Auto-open fires iff onboarding is set AND tour-done is absent.

describe('Tour first-visit auto-open', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.body.innerHTML = '';
  });
  afterEach(() => {
    window.localStorage.clear();
    document.body.innerHTML = '';
  });

  it('opens tour overlay automatically when onboarding done & tour not yet seen', () => {
    window.localStorage.setItem('kanshan-onboarding', JSON.stringify({ mode: 'guest' }));
    const { queryByTestId } = render(<TourTrigger />);
    expect(queryByTestId('tour-overlay')).toBeTruthy();
  });

  it('does NOT open tour when tour-done flag is present (returning visitor)', () => {
    window.localStorage.setItem('kanshan-onboarding', JSON.stringify({ mode: 'guest' }));
    window.localStorage.setItem('kanshan-tour-done', new Date().toISOString());
    const { queryByTestId } = render(<TourTrigger />);
    expect(queryByTestId('tour-overlay')).toBeNull();
  });

  it('does NOT open tour when onboarding has not been completed', () => {
    // OnboardingGate is still up — tour must not race ahead of it.
    const { queryByTestId } = render(<TourTrigger />);
    expect(queryByTestId('tour-overlay')).toBeNull();
  });

  it('re-evaluates on kanshan-onboarding-done event (mid-session gate dismissal)', () => {
    const { queryByTestId } = render(<TourTrigger />);
    expect(queryByTestId('tour-overlay')).toBeNull();
    // Simulate OnboardingGate finishing during the session.
    window.localStorage.setItem('kanshan-onboarding', JSON.stringify({ mode: 'guest' }));
    act(() => {
      window.dispatchEvent(new Event('kanshan-onboarding-done'));
    });
    expect(queryByTestId('tour-overlay')).toBeTruthy();
  });
});
