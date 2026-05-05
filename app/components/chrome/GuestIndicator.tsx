'use client';
import { useEffect, useState } from 'react';

interface State {
  guestId: string | null;
  mode: 'guest' | 'byo-key' | null;
}

export function GuestIndicator() {
  const [s, setS] = useState<State>({ guestId: null, mode: null });
  useEffect(() => {
    const m = document.cookie.match(/kanshan-guest-id=([a-f0-9]+)/);
    const guestId = m ? m[1] : null;
    let mode: 'guest' | 'byo-key' | null = null;
    try {
      const onb = window.localStorage.getItem('kanshan-onboarding');
      if (onb) mode = (JSON.parse(onb) as { mode: 'guest' | 'byo-key' }).mode;
    } catch {}
    // SSR snapshot can't read cookies/localStorage — must hydrate on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setS({ guestId, mode });
  }, []);
  if (!s.guestId) return null;
  const label = s.mode === 'byo-key' ? '自带密钥' : '受限模式';
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
