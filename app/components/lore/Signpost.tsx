'use client';
import type { CSSProperties } from 'react';
import { useState } from 'react';

interface SignpostProps {
  onOpen: () => void;
}

export function Signpost({ onOpen }: SignpostProps) {
  const [hovered, setHovered] = useState(false);
  const wrap: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
    transition: 'transform 280ms cubic-bezier(.16,.84,.24,1)',
    flexShrink: 0,
    marginLeft: 24,
    filter: hovered
      ? 'drop-shadow(0 0 12px rgba(168,155,126,0.6))'
      : 'drop-shadow(0 0 4px rgba(168,155,126,0.25))',
    background: 'transparent',
    border: 'none',
    padding: 0,
    margin: 0,
    fontFamily: 'inherit',
    color: 'inherit',
  };

  return (
    <button
      type="button"
      data-testid="lore-signpost"
      aria-label="技术细节 · 告示牌"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={onOpen}
      style={wrap}
    >
      <svg width={48} height={84} viewBox="0 0 48 84">
        {/* Post */}
        <rect x={22} y={36} width={4} height={48} fill="#3A2F22" />
        {/* Hanging board */}
        <rect x={6} y={20} width={36} height={20} fill="#5A4632" stroke="#3A2F22" strokeWidth={1} />
        {/* Two chains */}
        <line x1={12} y1={20} x2={12} y2={14} stroke="#3A2F22" strokeWidth={0.8} />
        <line x1={36} y1={20} x2={36} y2={14} stroke="#3A2F22" strokeWidth={0.8} />
        {/* Top peg */}
        <rect x={8} y={12} width={32} height={3} fill="#3A2F22" />
        {/* Faint glyph on board */}
        <text
          x={24}
          y={34}
          textAnchor="middle"
          fontFamily='"Noto Serif SC", serif'
          fontSize={11}
          fill="#A89B7E"
        >
          技
        </text>
      </svg>
      <div
        data-testid="lore-signpost-label"
        style={{
          marginTop: 6,
          fontSize: 9,
          color: '#A89B7E',
          fontFamily: '"Noto Serif SC", serif',
          letterSpacing: 2,
          opacity: hovered ? 1 : 0.5,
          transition: 'opacity 220ms',
        }}
      >
        告示牌
      </div>
    </button>
  );
}
