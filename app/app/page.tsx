import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { OnboardingGate } from '@/components/onboarding/OnboardingGate';
import { GuestIndicator } from '@/components/chrome/GuestIndicator';
import { KanshanChatBubble } from '@/components/chrome/KanshanChatBubble';
import { getWorkspaceBgUrl } from '@/lib/art/workspace-bg';
import { getOnboardingBgUrl } from '@/lib/art/onboarding-bg';
import { getAccountAvatarUrls } from '@/lib/art/account-avatars';

export default function Page() {
  const workspaceBgUrl = getWorkspaceBgUrl();
  const onboardingBgUrl = getOnboardingBgUrl();
  const avatarUrls = getAccountAvatarUrls();
  return (
    <>
      <WorkspaceShell
        workspaceBgUrl={workspaceBgUrl}
        avatarUrls={avatarUrls}
      />
      <KanshanChatBubble />
      <OnboardingGate bgUrl={onboardingBgUrl} />
      <div style={{ position: 'fixed', top: 4, right: 14, zIndex: 1000, display: 'flex', gap: 8, alignItems: 'center' }}>
        <GuestIndicator />
      </div>
    </>
  );
}
