'use client';

import { useState } from 'react';
import { FOXES, type FoxId } from '@/lib/foxes/registry';
import { Tail } from '@/components/atoms/Tail';
import { ShanFigure } from '@/components/atoms/ShanFigure';
import { FoxRail } from '@/components/atoms/FoxRail';

interface DockInnerProps {
  activeArr: FoxId[];
  onToggleFox: (id: FoxId) => void;
}

// Inline dock — simplified version of HybridDock for the rail.
// Same logic but tuned for 320px width.
export function DockInner({ activeArr, onToggleFox }: DockInnerProps) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const expanded = hover || pinned;

  const figSize = 70;
  const figH = figSize * 1.24;
  const anchorBottom = 50 + 14 + figH * 0.4;

  const restAngle = (idx: number, total: number) => {
    if (total === 1) return 0;
    if (total === 2) return idx === 0 ? -35 : 35;
    return -45 + idx * 90 / (total - 1);
  };
  const restOffsetX = (idx: number, total: number) => {
    if (total === 1) return 0;
    if (total === 2) return idx === 0 ? -16 : 16;
    return -22 + idx * 44 / (total - 1);
  };
  const expAngle = (i: number) => -88 + i * 176 / 8;

  return (
    <>
      {/* Pedestal mist */}
      <div style={{
        position: 'absolute', bottom: 46, left: '50%', transform: 'translateX(-50%)',
        width: expanded ? 280 : 180, height: 80,
        background: 'radial-gradient(ellipse at 50% 100%, rgba(232,238,245,0.85) 0%, rgba(200,215,235,0.35) 50%, transparent 75%)',
        zIndex: 2,
        transition: 'width .35s cubic-bezier(.2,.7,.3,1)'
      }} />

      {/* Tails */}
      <div
        data-testid="dock-tails-hover"
        style={{
          position: 'absolute', bottom: anchorBottom, left: '50%', zIndex: 3,
          cursor: 'pointer'
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => setPinned((p) => !p)}
      >
        <div style={{
          position: 'absolute', left: -140, top: -160, width: 280, height: 240,
          pointerEvents: 'auto'
        }} />

        {FOXES.map((f, i) => {
          const isActive = activeArr.includes(f.id);
          const activeIdx = activeArr.indexOf(f.id);
          let angle: number;
          let opacity: number;
          let size: number;
          let offsetX = 0;
          if (expanded) {
            angle = expAngle(i); opacity = 1;
            size = isActive ? 120 : 100;
          } else if (isActive) {
            angle = restAngle(activeIdx, activeArr.length);
            offsetX = restOffsetX(activeIdx, activeArr.length);
            opacity = 1; size = 120;
          } else {
            angle = 0; opacity = 0; size = 100;
          }
          return (
            <div key={f.id} style={{
              position: 'absolute', left: offsetX, top: 0, opacity,
              transition: 'opacity .35s, left .35s',
              pointerEvents: opacity > 0 ? 'auto' : 'none'
            }}>
              <Tail fox={f} active={isActive} size={size} rotate={angle}
                zIndex={isActive ? 5 + activeIdx : 1} />
            </div>
          );
        })}
      </div>

      {/* 看山 */}
      <div style={{
        position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)',
        zIndex: 6, cursor: 'pointer'
      }} onClick={() => setPinned((p) => !p)}>
        <ShanFigure size={figSize} glow={false} />
      </div>

      {/* Icon rail */}
      <div style={{
        position: 'absolute', bottom: 46, left: '50%', transform: 'translateX(-50%)',
        zIndex: 7
      }}>
        <FoxRail activeIds={activeArr} onPick={onToggleFox} />
      </div>

      {/* Orchestrator chat — bottom of rail */}
      <div style={{
        position: 'absolute', bottom: 10, left: 12, right: 12,
        background: 'rgba(242,245,249,0.96)',
        borderRadius: 8, padding: '7px 10px',
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(23,114,246,0.18)',
        fontFamily: '"Noto Sans SC", sans-serif',
        zIndex: 30
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: 9,
          background: '#1772F6', color: '#fff', fontSize: 10, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: '"Noto Serif SC", serif'
        }}>山</div>
        <div style={{ flex: 1, fontSize: 10.5, color: '#7A8595' }}>让看山想想……</div>
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#1772F6" strokeWidth="1.6" strokeLinecap="round">
          <path d="M2 7h10M7 2l5 5-5 5" />
        </svg>
      </div>
    </>
  );
}
