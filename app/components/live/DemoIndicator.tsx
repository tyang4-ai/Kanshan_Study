'use client';
import type { CSSProperties } from 'react';

const wrap: CSSProperties = {
  position: 'fixed',
  right: 16,
  bottom: 12,
  zIndex: 2500,
  padding: '5px 12px',
  background: 'rgba(20,22,30,0.78)',
  border: '1px solid rgba(168,155,126,0.35)',
  borderRadius: 2,
  color: '#E6EFFF',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 10,
  letterSpacing: 1.6,
  pointerEvents: 'none',
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

export function DemoIndicator() {
  return (
    <div data-testid="demo-indicator" style={wrap}>
      <span style={dot} />
      LIVE DEMO · 缓存模式
    </div>
  );
}
