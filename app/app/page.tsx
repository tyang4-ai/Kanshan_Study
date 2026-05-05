import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';
import { TourTrigger } from '@/components/tour/TourTrigger';
import { GuestIndicator } from '@/components/chrome/GuestIndicator';

export default function Page() {
  return (
    <>
      <WorkspaceShell />
      <OnboardingGate />
      <div style={{ position: 'fixed', top: 8, right: 16, zIndex: 1000, display: 'flex', gap: 8, alignItems: 'center' }}>
        <GuestIndicator />
        <TourTrigger />
      </div>
    </>
  );
}
