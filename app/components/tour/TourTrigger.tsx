'use client';
import { useEffect, useState } from 'react';
import { TourEngine } from './TourEngine';

type AutoState = 'pending' | 'auto' | 'manual' | 'done';

function readInitialAuto(): AutoState {
  if (typeof window === 'undefined') return 'pending';
  const onb = window.localStorage.getItem('kanshan-onboarding');
  const tourDone = window.localStorage.getItem('kanshan-tour-done');
  if (onb && !tourDone) return 'auto';
  return 'done';
}

export function TourTrigger() {
  // Initialize from localStorage in the lazy initializer so we never call
  // setState within an effect — this is what avoids cascading renders.
  const [auto, setAuto] = useState<AutoState>(readInitialAuto);
  const active = auto === 'auto' || auto === 'manual';

  // Keep the read SSR-safe: re-check after mount in case the lazy initializer
  // ran on the server with a typeof-window guard.
  useEffect(() => {
    if (auto !== 'pending') return;
    const raf = requestAnimationFrame(() => setAuto(readInitialAuto()));
    return () => cancelAnimationFrame(raf);
  }, [auto]);

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
