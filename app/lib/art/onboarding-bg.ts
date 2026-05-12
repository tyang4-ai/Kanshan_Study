import 'server-only';
import { pickAssetUrl } from './asset-resolver';

// Server-only resolver: call from a Server Component and pass the URL down
// to OnboardingGate (client) as a prop.
export function getOnboardingBgUrl(): string | null {
  // Prefer PNG (Gemini output format from Phase #16.5), fall back to JPG.
  return pickAssetUrl('/art/bg/onboarding.png') ?? pickAssetUrl('/art/bg/onboarding.jpg');
}
