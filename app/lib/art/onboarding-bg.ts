import { pickAssetUrl } from './asset-resolver';

// Resolved once at server-module-load. Imported by OnboardingGate (client).
export const ONBOARDING_BG_URL: string | null = pickAssetUrl('/art/bg/onboarding.jpg');
