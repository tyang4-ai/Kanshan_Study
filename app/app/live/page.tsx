'use client';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { DemoModeProvider } from '@/lib/demo-mode/context';
import { DemoIndicator } from '@/components/live/DemoIndicator';
import { NextBeatHint } from '@/components/live/NextBeatHint';
import { KanshanChatBubble } from '@/components/chrome/KanshanChatBubble';

// /live = finals demo mode. Forces server-side cache-only via fetch header.
// Mounts the same workspace as `/` plus the live indicator + scripted hint.
// Onboarding gate is intentionally NOT mounted here.
//
// Demo-day collapse (2026-05-13): the dual-account model was retired. /live
// now inhabits the same single 顾婉昔 persona as /, so there's nothing to
// reset on mount.
export default function LivePage() {
  return (
    <DemoModeProvider mode="live">
      <WorkspaceShell />
      {/* Casual user persona R3 (Pan Xiaolin) found 看山 chat was unreachable
          on /live because KanshanChatBubble was only mounted in app/page.tsx.
          Mount it here so the demo's 看山 orchestrator beat (right after
          cold-open) is accessible. */}
      <KanshanChatBubble />
      <DemoIndicator />
      <NextBeatHint />
    </DemoModeProvider>
  );
}
