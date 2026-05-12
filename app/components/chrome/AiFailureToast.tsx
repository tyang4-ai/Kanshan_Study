'use client';
import { useEffect, useState } from 'react';
import { useAiErrorStore } from '@/lib/store/ai-error';
import { useFloatingWindowStore } from '@/lib/store/floating-window';

const VISIBLE_MS = 6500;

export function AiFailureToast() {
  const current = useAiErrorStore((s) => s.current);
  const dismiss = useAiErrorStore((s) => s.dismiss);
  // R8 adversarial review (Ren Bo) P1: toast was hard-pinned bottom-right
  // while the failing panel sat centre-floating — judges missed the
  // connection. Anchor near the active floating window when one is open
  // so the error reads as "this panel just failed" instead of "something
  // somewhere failed". Falls back to bottom-right when no panel is open.
  const fwOpen = useFloatingWindowStore((s) => s.open);
  const fwPos = useFloatingWindowStore((s) => s.pos);
  const fwSize = useFloatingWindowStore((s) => s.size);
  const [vp, setVp] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = (): void => setVp({ w: window.innerWidth, h: window.innerHeight });
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => {
      // Only auto-dismiss if this is still the active one (id match guards
      // against a newer error replacing this one mid-timeout).
      const live = useAiErrorStore.getState().current;
      if (live && live.id === current.id) dismiss();
    }, VISIBLE_MS);
    return () => clearTimeout(t);
  }, [current, dismiss]);

  if (!current) return null;

  // Anchor calculation: if a floating window is open AND fits on screen,
  // dock the toast 8px below it. Otherwise pin bottom-right (R6 default).
  const anchor = (() => {
    if (!fwOpen) return { right: 24, bottom: 96, left: 'auto' as const, top: 'auto' as const };
    const desiredTop = fwPos.y + fwSize.h + 8;
    if (desiredTop + 90 > vp.h) {
      // Not enough room below — pin bottom-right but pulled toward the
      // window's left edge so the visual association remains.
      return { right: 24, bottom: 24, left: 'auto' as const, top: 'auto' as const };
    }
    return {
      left: Math.max(12, fwPos.x),
      top: desiredTop,
      right: 'auto' as const,
      bottom: 'auto' as const,
    };
  })();

  // R3 (史中 P0 2026-05-12): severity-driven accents. Default = error (red dot,
  // amber border); notice = amber dot, soft border — so graceful-degradation
  // notices don't read as failures.
  const isNotice = current.severity === 'notice';
  const dotBg = isNotice ? '#D9A23C' : '#C03028';
  const dotGlow = isNotice ? 'rgba(217,162,60,0.6)' : 'rgba(192,48,40,0.6)';
  const borderColor = isNotice ? 'rgba(217,162,60,0.55)' : 'rgba(168,155,126,0.45)';

  return (
    <div
      data-testid="ai-failure-toast"
      data-severity={current.severity ?? 'error'}
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        ...anchor,
        zIndex: 5000,
        maxWidth: 360,
        padding: '12px 14px 12px 14px',
        borderRadius: 8,
        background: 'rgba(28,32,42,0.96)',
        color: '#FBE9C2',
        fontFamily: '"Noto Serif SC", serif',
        fontSize: 12.5,
        lineHeight: 1.55,
        letterSpacing: 0.4,
        boxShadow: `0 14px 36px rgba(0,0,0,0.42), 0 0 0 0.5px ${borderColor}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          marginTop: 2,
          width: 8,
          height: 8,
          borderRadius: 4,
          background: dotBg,
          boxShadow: `0 0 6px ${dotGlow}`,
        }}
      />
      <span style={{ flex: 1 }}>{current.message}</span>
      <button
        data-testid="ai-failure-toast-dismiss"
        onClick={dismiss}
        title="关闭"
        style={{
          flexShrink: 0,
          background: 'transparent',
          border: 'none',
          color: 'rgba(251,233,194,0.7)',
          fontSize: 14,
          lineHeight: 1,
          cursor: 'pointer',
          padding: 0,
          marginLeft: 4,
        }}
      >
        ×
      </button>
    </div>
  );
}
