'use client';

import { useRef, useState } from 'react';
import { useRailWidthStore } from '@/lib/store/rail-width';
import { useCorkboardStore } from '@/lib/store/corkboard';
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [postitOpen, setPostitOpen] = useState(false);
  // Persona-fix #4 (2026-05-09 周敏 review): clearKanshan affordance only shows
  // when there's at least one 看山-pinned card. Avoids visual clutter when
  // the orchestrator hasn't dispatched anything yet.
  const kanshanPinCount = useCorkboardStore((s) =>
    s.pins.filter((p) => p.createdBy === 'kanshan').length,
  );
  const clearKanshan = useCorkboardStore((s) => s.clearKanshan);

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
      data-tour-id="left-rail"
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
          {/* Persona-fix #5 (2026-05-09): "BULLETIN · 看典书房" reads as a typo
              of the project name 看山书房. Renamed to be unambiguous. */}
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>BULLETIN · 你的便签板</span>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {kanshanPinCount > 0 && (
              <button
                type="button"
                data-testid="rail-clear-kanshan"
                onClick={clearKanshan}
                title={`清掉看山钉的 ${kanshanPinCount} 张便签 (你自己的不动)`}
                aria-label="只清看山所钉"
                style={{
                  background: 'rgba(168,155,126,0.18)',
                  border: '1px solid rgba(168,155,126,0.4)',
                  color: 'rgba(26,31,42,0.7)',
                  fontFamily: '"Noto Serif SC", serif',
                  fontSize: 9,
                  letterSpacing: 1,
                  padding: '1px 5px',
                  borderRadius: 2,
                  cursor: 'pointer',
                }}
              >
                清看山钉 {kanshanPinCount}
              </button>
            )}
            <RailIcon
              kind="search"
              ariaLabel="过滤板上内容"
              active={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
            />
            <RailIcon
              kind="add"
              ariaLabel="添加便签"
              active={postitOpen}
              onClick={() => setPostitOpen((v) => !v)}
            />
          </span>
        </div>

        <RailContent
          width={width}
          searchOpen={searchOpen}
          postitOpen={postitOpen}
          onCloseSearch={() => setSearchOpen(false)}
          onClosePostit={() => setPostitOpen(false)}
        />

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
