import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { DemoModeProvider } from '@/lib/demo-mode/context';
import { DemoIndicator } from '@/components/live/DemoIndicator';
import { NextBeatHint } from '@/components/live/NextBeatHint';

// /live = finals demo mode. Forces server-side cache-only via fetch header.
// Mounts the same workspace as `/` plus the live indicator + scripted hint.
// Onboarding gate is intentionally NOT mounted here.
export default function LivePage() {
  return (
    <DemoModeProvider mode="live">
      <WorkspaceShell />
      <DemoIndicator />
      <NextBeatHint />
    </DemoModeProvider>
  );
}
