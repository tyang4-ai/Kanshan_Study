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
      {/* Bottom-left, well clear of LeftRail's "看山想想" input + dock above it,
          and editor tab strip chips at top. */}
      <div style={{ position: 'fixed', bottom: 14, left: 360, zIndex: 1000, display: 'flex', gap: 8, alignItems: 'center' }}>
        <GuestIndicator />
        <TourTrigger />
      </div>
    </>
  );
}
