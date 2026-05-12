'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { FOXES, type FoxId } from '@/lib/foxes/registry';
import { FoxGuideCard } from './FoxGuideCard';
import { useDailyFoxPulseStore } from '@/lib/store/daily-fox-pulse';

interface FoxRailProps {
  activeIds: FoxId[];
  onPick: (id: FoxId) => void;
  style?: CSSProperties;
}

const HOVER_OPEN_DELAY = 300;
const HOVER_CLOSE_DELAY = 150;

export function FoxRail({ activeIds, onPick, style = {} }: FoxRailProps) {
  const activeSet = useMemo(() => new Set(activeIds), [activeIds]);
  const [hoveredFox, setHoveredFox] = useState<{ id: FoxId; anchorRect: DOMRect } | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const pulseFox = useDailyFoxPulseStore((s) => s.glowingFox);

  useEffect(() => {
    return () => {
      if (openTimer.current !== null) window.clearTimeout(openTimer.current);
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  const scheduleOpen = (id: FoxId, anchorRect: DOMRect) => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (openTimer.current !== null) window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => {
      setHoveredFox({ id, anchorRect });
      openTimer.current = null;
    }, HOVER_OPEN_DELAY);
  };

  const scheduleClose = () => {
    if (openTimer.current !== null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (hoveredFox === null) return;
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setHoveredFox(null);
      closeTimer.current = null;
    }, HOVER_CLOSE_DELAY);
  };

  return (
    <>
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
          const isPulsing = pulseFox === f.id;
          return (
            <button key={f.id}
              data-fox-id={f.id}
              onClick={(e) => { e.stopPropagation(); onPick(f.id); }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                scheduleOpen(f.id, rect);
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              }}
              onMouseLeave={(e) => {
                scheduleClose();
                if (!isActive) e.currentTarget.style.background = isPulsing ? f.glow : 'transparent';
              }}
              title={`${f.name} · ${f.verb}`}
              aria-label={`${f.name} · ${f.verb}${f.verbSubtitle ? ` (${f.verbSubtitle})` : ''}`}
              aria-pressed={isActive}
              style={{
                width: 22, height: 22, borderRadius: 11,
                border: 'none',
                background: isActive || isPulsing ? f.glow : 'transparent',
                color: isActive || isPulsing ? '#fff' : 'rgba(255,255,255,0.75)',
                fontFamily: '"Source Han Serif SC", "Noto Serif SC", serif',
                fontSize: 12, fontWeight: 500,
                cursor: 'pointer',
                transition: 'all .18s',
                boxShadow: isActive || isPulsing ? `0 0 8px ${f.glowSoft}` : 'none',
                padding: 0, flexShrink: 0,
              }}
            >
              {f.initial}
            </button>
          );
        })}
      </div>
      {hoveredFox && (
        <FoxGuideCard
          foxId={hoveredFox.id}
          anchorRect={hoveredFox.anchorRect}
          onClose={() => setHoveredFox(null)}
        />
      )}
    </>
  );
}
