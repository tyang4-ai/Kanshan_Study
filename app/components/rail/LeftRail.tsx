'use client';

import { useRef } from 'react';
import { useRailWidthStore } from '@/lib/store/rail-width';
import { CorkBg } from '@/components/atoms/CorkBg';
import { RailIcon } from './RailIcon';
import { RailContent } from './RailContent';
import { DockSection } from './DockSection';

// Left rail — corkboard at top, dock at the bottom.
// Width is driven by useRailWidthStore (clamped 220–560 inside the store).
// LoreEnvelope is mounted at workspace shell level, NOT here.
export function LeftRail() {
  const dragRef = useRef<HTMLDivElement | null>(null);
  const width = useRailWidthStore((s) => s.width);
  const setWidth = useRailWidthStore((s) => s.setWidth);

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const onMove = (ev: MouseEvent) => {
      setWidth(startW + (ev.clientX - startX));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      data-testid="left-rail-root"
      style={{
        width, height: '100%',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
        flexShrink: 0
      }}
    >
      <CorkBg style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        boxShadow: 'inset -1px 0 0 rgba(0,0,0,0.08)'
      }}>
        {/* Rail header */}
        <div style={{
          position: 'absolute', top: 8, left: 12, right: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 30,
          fontFamily: '"Noto Sans SC", sans-serif',
          fontSize: 10, color: 'rgba(26,31,42,0.7)',
          letterSpacing: 1
        }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>BULLETIN · 看典书房</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <RailIcon kind="search" />
            <RailIcon kind="add" />
          </span>
        </div>

        <RailContent />

        {/* Dock area at bottom */}
        <DockSection />
      </CorkBg>

      {/* Resize handle — sits on the right edge */}
      <div
        ref={dragRef}
        onMouseDown={startDrag}
        className="rail-resize"
        data-testid="rail-resize-handle"
        style={{
          position: 'absolute', top: 0, right: -3, bottom: 0, width: 6,
          cursor: 'col-resize', zIndex: 100
        }}
        title="拖动调整宽度"
      >
        <div style={{
          position: 'absolute', top: '50%', right: 1, transform: 'translateY(-50%)',
          width: 2, height: 28, borderRadius: 1,
          background: 'rgba(26,31,42,0.18)',
          opacity: 0, transition: 'opacity .2s',
          pointerEvents: 'none'
        }} className="rail-grip" />
      </div>
    </div>
  );
}
