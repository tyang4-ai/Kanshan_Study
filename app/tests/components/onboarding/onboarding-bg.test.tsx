import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// The server-only `@/lib/art/onboarding-bg` is not imported by OnboardingGate
// anymore — the resolved URL is passed as a `bgUrl` prop from the page-level
// Server Component. Tests pass it directly.

describe('OnboardingGate · background image', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => cleanup());

  it('does NOT render onboarding-bg-image when bgUrl is null', async () => {
    const { OnboardingGate } = await import('@/components/onboarding/OnboardingGate');
    const { queryByTestId } = render(<OnboardingGate bgUrl={null} />);
    expect(queryByTestId('onboarding-bg-image')).toBeNull();
  });

  it('does NOT render onboarding-bg-image when bgUrl is undefined', async () => {
    const { OnboardingGate } = await import('@/components/onboarding/OnboardingGate');
    const { queryByTestId } = render(<OnboardingGate />);
    expect(queryByTestId('onboarding-bg-image')).toBeNull();
  });

  it('renders onboarding-bg-image with the resolved URL when present', async () => {
    const { OnboardingGate } = await import('@/components/onboarding/OnboardingGate');
    const { getByTestId } = render(<OnboardingGate bgUrl="/art/bg/onboarding.jpg" />);
    const img = getByTestId('onboarding-bg-image') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/art/bg/onboarding.jpg');
    expect(img.getAttribute('aria-hidden')).toBe('true');
  });
});
