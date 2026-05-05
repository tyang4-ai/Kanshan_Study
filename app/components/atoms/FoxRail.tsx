'use client';
import { useMemo, type CSSProperties } from 'react';
import { FOXES, type FoxId } from '@/lib/foxes/registry';

interface FoxRailProps {
  activeIds: FoxId[];
  onPick: (id: FoxId) => void;
  style?: CSSProperties;
}

export function FoxRail({ activeIds, onPick, style = {} }: FoxRailProps) {
  const activeSet = useMemo(() => new Set(activeIds), [activeIds]);
  return (
    <div data-tour-id="fox-tails" style={{
      display: 'flex', gap: 2, padding: '5px 6px',
      background: 'rgba(26,31,42,0.72)',
      backdropFilter: 'blur(8px)',
      borderRadius: 22,
      boxShadow: '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
      maxWidth: '100%',
      ...style,
    }}>
      {FOXES.map((f) => {
        const isActive = activeSet.has(f.id);
        return (
          <button key={f.id}
            onClick={(e) => { e.stopPropagation(); onPick(f.id); }}
            title={`${f.name} · ${f.verb}`}
            aria-pressed={isActive}
            style={{
              width: 22, height: 22, borderRadius: 11,
              border: 'none',
              background: isActive ? f.glow : 'transparent',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
              fontFamily: '"Source Han Serif SC", "Noto Serif SC", serif',
              fontSize: 12, fontWeight: 500,
              cursor: 'pointer',
              transition: 'all .18s',
              boxShadow: isActive ? `0 0 8px ${f.glowSoft}` : 'none',
              padding: 0, flexShrink: 0,
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            {f.initial}
          </button>
        );
      })}
    </div>
  );
}
