import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

const bgRef = vi.hoisted(() => ({ url: null as string | null }));

vi.mock('@/lib/art/onboarding-bg', () => ({
  get ONBOARDING_BG_URL() { return bgRef.url; },
}));

describe('OnboardingGate · background image', () => {
  beforeEach(() => {
    bgRef.url = null;
    window.localStorage.clear();
  });
  afterEach(() => cleanup());

  it('does NOT render onboarding-bg-image when asset is null', async () => {
    bgRef.url = null;
    const { OnboardingGate } = await import('@/components/onboarding/OnboardingGate');
    const { queryByTestId } = render(<OnboardingGate />);
    expect(queryByTestId('onboarding-bg-image')).toBeNull();
  });

  it('renders onboarding-bg-image with the resolved URL when present', async () => {
    bgRef.url = '/art/bg/onboarding.jpg';
    const { OnboardingGate } = await import('@/components/onboarding/OnboardingGate');
    const { getByTestId } = render(<OnboardingGate />);
    const img = getByTestId('onboarding-bg-image') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/art/bg/onboarding.jpg');
    expect(img.getAttribute('aria-hidden')).toBe('true');
  });
});
