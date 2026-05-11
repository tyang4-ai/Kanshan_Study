'use client';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';

const wrap: CSSProperties = {
  position: 'fixed',
  right: 16,
  bottom: 12,
  zIndex: 2500,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '5px 6px 5px 12px',
  background: 'rgba(20,22,30,0.78)',
  border: '1px solid rgba(168,155,126,0.35)',
  borderRadius: 2,
  color: '#E6EFFF',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 10,
  letterSpacing: 1.6,
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
};

const dot: CSSProperties = {
  display: 'inline-block',
  width: 6,
  height: 6,
  borderRadius: 3,
  background: '#E04A3F',
  marginRight: 6,
  boxShadow: '0 0 6px rgba(224,74,63,0.7)',
  animation: 'pulse 1.6s ease-in-out infinite',
  verticalAlign: 'middle',
};

const exitBtn: CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(230,239,255,0.32)',
  color: '#E6EFFF',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 10,
  letterSpacing: 0.8,
  padding: '2px 8px',
  borderRadius: 2,
  cursor: 'pointer',
};

// Persona-review 2026-05-11 R2 P0 (casual user Tang Yu): /live mode entered
// accidentally has no escape; users got stuck. Adds an explicit 退出 button.
//
// R3 demo-flow judge regression: Next.js <Link href="/"> prefetched the home
// route which collided with the DemoModeProvider's window.fetch patch and
// made every subsequent click navigate to /. Reverted to router.push so the
// prefetch never fires.
export function DemoIndicator() {
  const router = useRouter();
  return (
    <div data-testid="demo-indicator" style={wrap}>
      <span style={dot} />
      <span>LIVE DEMO · 缓存模式</span>
      <button
        type="button"
        data-testid="demo-exit"
        aria-label="退出演示模式，回到常规工作台"
        onClick={() => router.push('/')}
        style={exitBtn}
      >
        退出
      </button>
    </div>
  );
}
