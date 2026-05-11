'use client';

import { useState, type MouseEvent } from 'react';
import { FOXES, type FoxId } from '@/lib/foxes/registry';
import { Tail } from '@/components/atoms/Tail';
import { ShanFigure } from '@/components/atoms/ShanFigure';
import { FoxRail } from '@/components/atoms/FoxRail';
import { useFloatingWindowStore, type TabKind } from '@/lib/store/floating-window';
import { useEditorStore } from '@/lib/store/editor';
import { useAiErrorStore } from '@/lib/store/ai-error';

// Read the current editor's selected text. Returns null when no editor mounted
// or no non-empty selection — caller decides whether to gate (mo/voice-diff) or
// proceed with no-selection fallback (persona/debate/research panels accept it).
function getEditorSelection(): string | null {
  const editor = useEditorStore.getState().editor;
  if (!editor) return null;
  const { from, to, empty } = editor.state.selection;
  if (empty) return null;
  const text = editor.state.doc.textBetween(from, to, ' ').trim();
  return text || null;
}

interface DockInnerProps {
  activeArr: FoxId[];
  onToggleFox: (id: FoxId) => void;
}

// Map a fox click to the tab it should open (or null = selection only).
// 看山 = orchestrator (no tab); 看心 = silent compliance monitor (no dedicated
// tab kind exists, so selection only).
const FOX_TAB: Record<FoxId, { kind: TabKind; title: string } | null> = {
  shan: null,
  mo: { kind: 'voice-diff', title: '看墨 · 语风' },
  wen: { kind: 'debate', title: '看文 · 看纹辩论' },
  wen2: { kind: 'debate', title: '看文 · 看纹辩论' },
  shui: { kind: 'research', title: '看水 · 深度研究' },
  dian: { kind: 'vault', title: '看典 · 档案库' },
  shi: { kind: 'trends', title: '看势 · 热点雷达' },
  jing: { kind: 'stats', title: '看镜 · 数据复盘' },
  xin: null,
};

// 4-vs-5 hierarchy reframe (2026-05-09): the 4 foxes the user converses with
// directly (shan/wen/wen2/jing) read as primary; the 5 tool foxes
// (mo/shui/dian/shi/xin) are dispatched-by-看山 and de-emphasized in the
// expanded dock. All 9 stay clickable — preserves Q&A card #5.
const TALK_TO_FOXES = new Set<FoxId>(['shan', 'wen', 'wen2', 'jing']);

// Inline dock — simplified version of HybridDock for the rail.
// Same logic but tuned for 320px width.
export function DockInner({ activeArr, onToggleFox }: DockInnerProps) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const expanded = hover || pinned;
  const openTab = useFloatingWindowStore((s) => s.openTab);

  // Centralized fox→tab dispatch. 看墨 (mo / voice-diff) requires a selection
  // to rewrite — gate with a toast if empty. Other foxes pass selection
  // through when present but accept empty (persona/debate/research panels
  // handle no-selection states themselves).
  const dispatchFox = (id: FoxId): void => {
    onToggleFox(id);
    const target = FOX_TAB[id];
    if (!target) return;
    const selection = getEditorSelection();
    if (target.kind === 'voice-diff' && !selection) {
      useAiErrorStore.getState().push({
        message: '请先在编辑器选中要润色的段落，再让看墨重写。',
      });
      return;
    }
    const props = selection ? { mode: 'polish' as const, selection } : undefined;
    openTab(target.kind, target.title, props);
  };

  const handleFoxClick = (id: FoxId) => (e: MouseEvent) => {
    e.stopPropagation();
    dispatchFox(id);
  };

  // FoxRail icons (the small dock buttons) toggle the active fox AND open the
  // corresponding floating tab. Without this, clicking a rail icon only set
  // the active fox state and the user got no visible feedback.
  const handleRailPick = (id: FoxId) => {
    dispatchFox(id);
  };

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
            angle = expAngle(i);
            // Tool foxes get a subtle 0.7 dim in expanded mode; talk-to foxes
            // and the active fox keep full opacity. Hover handler restores via
            // the wrapping `expanded` state itself (no per-fox hover tracking).
            opacity = isActive || TALK_TO_FOXES.has(f.id) ? 1 : 0.7;
            size = isActive ? 120 : 100;
          } else if (isActive) {
            angle = restAngle(activeIdx, activeArr.length);
            offsetX = restOffsetX(activeIdx, activeArr.length);
            opacity = 1; size = 120;
          } else {
            angle = 0; opacity = 0; size = 100;
          }
          return (
            <div key={f.id}
              title={`${f.name} · ${f.verb}`}
              onClick={handleFoxClick(f.id)}
              style={{
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
        <FoxRail activeIds={activeArr} onPick={handleRailPick} />
      </div>

      {/* Orchestrator chat input removed — not wired in MVP, returns in plan #14 */}
    </>
  );
}
