'use client';
import { useState } from 'react';

interface RailIconProps {
  kind: 'search' | 'add';
  onClick?: () => void;
  active?: boolean;
  ariaLabel?: string;
}

// Casual user R3 (Pan Xiaolin) couldn't find the + button — was a bare 14px
// SVG with no hit-area chrome. Wrap in a real <button> with hover/focus
// affordances + 22px hit area while keeping the 14px icon visual.
export function RailIcon({ kind, onClick, active, ariaLabel }: RailIconProps) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={ariaLabel ?? (kind === 'search' ? '搜索' : '添加便签')}
      title={ariaLabel ?? (kind === 'search' ? '搜索 (Ctrl+F)' : '添加便签 (+)')}
      style={{
        width: 22,
        height: 22,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        background: active
          ? 'rgba(26,31,42,0.12)'
          : hover
          ? 'rgba(26,31,42,0.06)'
          : 'transparent',
        border: active
          ? '1px solid rgba(26,31,42,0.35)'
          : '1px solid transparent',
        borderRadius: 4,
        cursor: 'pointer',
        color: active || hover ? 'rgba(26,31,42,0.95)' : 'rgba(26,31,42,0.55)',
        transition: 'background 0.12s, color 0.12s, border-color 0.12s',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        {kind === 'search' ? (
          <>
            <circle cx="6" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
            <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </>
        ) : (
          <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}
