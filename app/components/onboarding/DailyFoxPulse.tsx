'use client';
import { useEffect, useRef, useState } from 'react';
import { useAccountStore } from '@/lib/store/account';
import { useDailyFoxPulseStore } from '@/lib/store/daily-fox-pulse';
import type { FoxId } from '@/lib/foxes/registry';

// 日常 4 只 — 势 / 典 / 墨 / 水 in display order (per task spec).
const DAILY_FOX_SEQUENCE: FoxId[] = ['shi', 'dian', 'mo', 'shui'];
const STEP_MS = 800;
const LS_KEY_PREFIX = 'kanshan-fox-pulse-seen:';

function lsKey(accountId: string): string {
  return `${LS_KEY_PREFIX}${accountId}`;
}

export function DailyFoxPulse() {
  const accountId = useAccountStore((s) => s.active);
  const setGlowingFox = useDailyFoxPulseStore((s) => s.setGlowingFox);
  const [active, setActive] = useState(false);
  const timersRef = useRef<number[]>([]);

  const clearAll = () => {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let seen = false;
    try {
      seen = window.localStorage.getItem(lsKey(accountId)) !== null;
    } catch {
      seen = true; // if storage is blocked, treat as seen and skip pulse
    }
    if (seen) {
      setGlowingFox(null);
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(true);
    DAILY_FOX_SEQUENCE.forEach((foxId, idx) => {
      const t = window.setTimeout(() => {
        setGlowingFox(foxId);
      }, idx * STEP_MS);
      timersRef.current.push(t);
    });
    const finishTimer = window.setTimeout(() => {
      setGlowingFox(null);
      setActive(false);
      try {
        window.localStorage.setItem(lsKey(accountId), '1');
      } catch {
        /* noop */
      }
    }, DAILY_FOX_SEQUENCE.length * STEP_MS);
    timersRef.current.push(finishTimer);

    return () => {
      clearAll();
      setGlowingFox(null);
    };
  }, [accountId, setGlowingFox]);

  useEffect(() => {
    if (!active) return;
    const handler = () => {
      clearAll();
      setGlowingFox(null);
      setActive(false);
      try {
        window.localStorage.setItem(lsKey(accountId), '1');
      } catch {
        /* noop */
      }
    };
    window.addEventListener('click', handler, { once: true });
    return () => window.removeEventListener('click', handler);
  }, [active, accountId, setGlowingFox]);

  if (!active) return null;

  return (
    <div
      data-testid="daily-fox-pulse-caption"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 64,
        transform: 'translateX(-50%)',
        zIndex: 1500,
        padding: '6px 14px',
        background: 'rgba(26,31,42,0.72)',
        backdropFilter: 'blur(6px)',
        color: '#E8DCC4',
        borderRadius: 14,
        fontSize: 11,
        letterSpacing: 0.8,
        fontFamily: '"Noto Sans SC", sans-serif',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        pointerEvents: 'none',
      }}
    >
      日常 4 只 · 势 · 典 · 墨 · 水
    </div>
  );
}
