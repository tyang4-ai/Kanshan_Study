'use client';
import { useEffect, useState } from 'react';

interface State {
  guestId: string | null;
  liveMode: boolean;
}

// Demo-day collapse (2026-05-13): used to switch between "受限模式" / "自带密钥"
// labels reading the (now-retired) byo-key vs guest onboarding mode. Now
// just indicates whether the workspace is in cache demo (default) or live
// LLM mode, plus the per-browser guest id.
export function GuestIndicator() {
  const [s, setS] = useState<State>({ guestId: null, liveMode: false });
  useEffect(() => {
    const m = document.cookie.match(/kanshan-guest-id=([a-f0-9]+)/);
    const guestId = m ? m[1] : null;
    let liveMode = false;
    try {
      const raw = window.localStorage.getItem('kanshan-live-mode');
      if (raw) {
        const parsed = JSON.parse(raw) as { enabled?: boolean };
        liveMode = parsed?.enabled === true;
      }
    } catch { /* localStorage unavailable */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setS({ guestId, liveMode });
  }, []);
  if (!s.guestId) return null;
  const label = s.liveMode ? '实时模式' : '缓存演示';
  return (
    <div data-testid="guest-indicator" style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 10, color: '#7A8B9F', fontFamily: 'JetBrains Mono, monospace',
      letterSpacing: 0.6, padding: '3px 8px',
      border: '1px solid rgba(122,139,159,0.2)',
      borderRadius: 2,
    }}>
      <span>访客 #{s.guestId.slice(0, 6)}</span>
      <span>·</span>
      <span>{label}</span>
    </div>
  );
}
