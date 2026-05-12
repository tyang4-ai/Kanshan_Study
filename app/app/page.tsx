import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';
import { TourTrigger } from '@/components/tour/TourTrigger';
import { GuestIndicator } from '@/components/chrome/GuestIndicator';
import { KanshanChatBubble } from '@/components/chrome/KanshanChatBubble';
import { getLoreAssets } from '@/components/lore/loreAssets.server';

export default function Page() {
  const publicMode = process.env.KANSHAN_PUBLIC_MODE === 'byo-or-cache';
  // In public mode the "guest" path becomes cache-only (no operator credit
  // spend); in self-hosted mode it falls back to the deployment's own key.
  const guestModeAvailable =
    publicMode || Boolean(process.env.KIMI_API_KEY || process.env.DEEPSEEK_API_KEY);
  const loreAssets = getLoreAssets();
  return (
    <>
      <WorkspaceShell loreHutImages={loreAssets.huts} loreBgImage={loreAssets.bg} />
      <KanshanChatBubble />
      <OnboardingGate guestModeAvailable={guestModeAvailable} publicMode={publicMode} />
      {/* 2026-05-11 phase #15.5: moved off bottom-left to free the editor footer
          for PublishButton + the file I/O buttons; sits top-right above the
          tagline strip clear of every other chrome control. */}
      <div style={{ position: 'fixed', top: 4, right: 14, zIndex: 1000, display: 'flex', gap: 8, alignItems: 'center' }}>
        <GuestIndicator />
        <TourTrigger />
      </div>
    </>
  );
}
