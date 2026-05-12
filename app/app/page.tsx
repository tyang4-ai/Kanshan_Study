import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';
import { TourTrigger } from '@/components/tour/TourTrigger';
import { GuestIndicator } from '@/components/chrome/GuestIndicator';
import { KanshanChatBubble } from '@/components/chrome/KanshanChatBubble';

export default function Page() {
  const guestModeAvailable = Boolean(process.env.KIMI_API_KEY || process.env.DEEPSEEK_API_KEY);
  return (
    <>
      <WorkspaceShell />
      <KanshanChatBubble />
      <OnboardingGate guestModeAvailable={guestModeAvailable} />
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
