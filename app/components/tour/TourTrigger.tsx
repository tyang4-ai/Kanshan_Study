'use client';
import { useEffect, useState } from 'react';
import { TourEngine } from './TourEngine';

type AutoState = 'pending' | 'auto' | 'manual' | 'done';

function readPostMountAuto(): AutoState {
  const onb = window.localStorage.getItem('kanshan-onboarding');
  const tourDone = window.localStorage.getItem('kanshan-tour-done');
  if (onb && !tourDone) return 'auto';
  return 'done';
}

export function TourTrigger() {
  // Hydration-safe: server + client first render BOTH return 'pending'
  // (so neither renders the engine). A post-mount effect then reads
  // localStorage and flips state accordingly.
  const [auto, setAuto] = useState<AutoState>('pending');
  const active = auto === 'auto' || auto === 'manual';

  useEffect(() => {
    if (auto !== 'pending') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuto(readPostMountAuto());
  }, [auto]);

  // When OnboardingGate dismisses mid-session, it dispatches this event so we
  // can re-evaluate and auto-fire the tour without requiring a page reload.
  // Without this, a first-time visitor would dismiss the gate and never see
  // the tour because TourTrigger's mount-time read returned 'done'.
  useEffect(() => {
    const handler = () => {
      const state = readPostMountAuto();
      if (state === 'auto') setAuto('auto');
    };
    window.addEventListener('kanshan-onboarding-done', handler);
    return () => window.removeEventListener('kanshan-onboarding-done', handler);
  }, []);

  return (
    <>
      <button
        data-testid="tour-trigger"
        onClick={() => setAuto('manual')}
        style={{
          fontSize: 10,
          padding: '3px 8px',
          background: 'transparent',
          border: '1px solid rgba(122,139,159,0.25)',
          borderRadius: 2,
          color: '#7A8B9F',
          cursor: 'pointer',
          fontFamily: '"Noto Serif SC", serif',
          letterSpacing: 1.5,
        }}
      >
        第一次来？
      </button>
      {active && <TourEngine onComplete={() => setAuto('done')} />}
    </>
  );
}
