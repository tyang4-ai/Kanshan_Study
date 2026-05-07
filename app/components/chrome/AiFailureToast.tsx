'use client';
import { useEffect } from 'react';
import { useAiErrorStore } from '@/lib/store/ai-error';

const VISIBLE_MS = 6500;

export function AiFailureToast() {
  const current = useAiErrorStore((s) => s.current);
  const dismiss = useAiErrorStore((s) => s.dismiss);

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

  return (
    <div
      data-testid="ai-failure-toast"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        right: 24,
        bottom: 96,
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
        boxShadow: '0 14px 36px rgba(0,0,0,0.42), 0 0 0 0.5px rgba(168,155,126,0.45)',
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
          background: '#C03028',
          boxShadow: '0 0 6px rgba(192,48,40,0.6)',
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
