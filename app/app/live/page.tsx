'use client';
import { useEffect } from 'react';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { DemoModeProvider } from '@/lib/demo-mode/context';
import { DemoIndicator } from '@/components/live/DemoIndicator';
import { NextBeatHint } from '@/components/live/NextBeatHint';
import { useAccountStore } from '@/lib/store/account';

// /live = finals demo mode. Forces server-side cache-only via fetch header.
// Mounts the same workspace as `/` plus the live indicator + scripted hint.
// Onboarding gate is intentionally NOT mounted here.
//
// Persona-review 2026-05-11 (demo-flow judge P0): cold-open on /live must
// land on the `me` account regardless of what was last active in localStorage,
// so the script's opening beat ("先看一眼我自己的书房") is reproducible across
// rehearsals. We reset the account once on mount.
export default function LivePage() {
  useEffect(() => {
    const { active, switchTo } = useAccountStore.getState();
    if (active !== 'me') switchTo('me');
  }, []);

  return (
    <DemoModeProvider mode="live">
      <WorkspaceShell />
      <DemoIndicator />
      <NextBeatHint />
    </DemoModeProvider>
  );
}
