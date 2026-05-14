'use client';
// r5 TASK B (李笛 P1): replaces the native browser `title` tooltip on
// .kanshan-xin-flag spans with a real 280px React HoverCard. Single instance
// mounted globally near the editor root; event delegation on mouseover /
// mouseout binds to all underlines without per-decoration listeners.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingWindowStore } from '@/lib/store/floating-window';

interface HoverState {
  reason: string;
  excerpt: string;
  rect: DOMRect;
}

export function XinHoverCard(): React.ReactElement | null {
  const [hover, setHover] = useState<HoverState | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const openTab = useFloatingWindowStore((s) => s.openTab);

  useEffect(() => {
    const root: ParentNode = document;
    const findFlag = (target: EventTarget | null): HTMLElement | null => {
      const el = target as HTMLElement | null;
      return el?.closest?.('.kanshan-xin-flag') as HTMLElement | null;
    };

    const onOver = (e: Event): void => {
      const flag = findFlag(e.target);
      if (!flag) return;
      if (hideTimerRef.current != null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      const reason = flag.getAttribute('title') ?? flag.getAttribute('data-reason') ?? '看心 标记';
      const excerpt = flag.textContent ?? '';
      const rect = flag.getBoundingClientRect();
      setHover({ reason, excerpt, rect });
    };
    const onOut = (e: Event): void => {
      const flag = findFlag(e.target);
      if (!flag) return;
      // small grace so moving from the underline INTO the card doesn't dismiss
      hideTimerRef.current = window.setTimeout(() => setHover(null), 180);
    };

    root.addEventListener('mouseover', onOver as EventListener);
    root.addEventListener('mouseout', onOut as EventListener);
    return () => {
      root.removeEventListener('mouseover', onOver as EventListener);
      root.removeEventListener('mouseout', onOut as EventListener);
      if (hideTimerRef.current != null) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Cancel pending hide when the user hovers the card itself.
  const onCardEnter = (): void => {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };
  const onCardLeave = (): void => {
    hideTimerRef.current = window.setTimeout(() => setHover(null), 120);
  };

  if (typeof document === 'undefined') return null;
  if (!hover) return null;

  // Position: directly above the underline, centered horizontally; if the
  // card would clip the viewport top, flip below.
  const CARD_W = 280;
  const CARD_H = 130;
  const VIEWPORT_PAD = 12;
  const centerX = hover.rect.left + hover.rect.width / 2;
  let left = Math.max(VIEWPORT_PAD, Math.min(window.innerWidth - CARD_W - VIEWPORT_PAD, centerX - CARD_W / 2));
  let top = hover.rect.top - CARD_H - 10;
  if (top < VIEWPORT_PAD) {
    top = hover.rect.bottom + 10;
  }

  const cardStyle: CSSProperties = {
    position: 'fixed',
    left,
    top,
    width: CARD_W,
    background: '#FBFAF7',
    border: '1px solid rgba(184,85,67,0.35)',
    borderRadius: 6,
    boxShadow: '0 8px 24px rgba(31,21,16,0.18)',
    padding: '10px 12px',
    fontFamily: '"Noto Serif SC", serif',
    color: '#1A1F2A',
    fontSize: 11.5,
    lineHeight: 1.6,
    zIndex: 9000,
    pointerEvents: 'auto',
  };

  return createPortal(
    <div
      data-testid="xin-hover-card"
      role="tooltip"
      style={cardStyle}
      onMouseEnter={onCardEnter}
      onMouseLeave={onCardLeave}
    >
      {/* Card top — 看心 logo dot + 标记 type */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 18, height: 18, borderRadius: 9,
          background: '#B85543', color: '#FBFAF7',
          fontFamily: '"Noto Serif SC", serif', fontWeight: 600, fontSize: 11,
        }}>心</span>
        <span style={{ fontSize: 11, color: '#7A2A1F', fontWeight: 600, letterSpacing: 0.4 }}>
          {hover.reason}
        </span>
      </div>

      {/* Card body — excerpt + reason copy */}
      <div style={{ color: '#3A3633', marginBottom: 8, fontStyle: 'italic' }}>
        “{hover.excerpt.slice(0, 60)}{hover.excerpt.length > 60 ? '…' : ''}”
      </div>
      <div style={{ fontSize: 10.5, color: '#5A6270', marginBottom: 8 }}>
        看心检测：&ldquo;一定&rdquo; / &ldquo;100%&rdquo; / &ldquo;根治&rdquo; 等表述不可证伪，建议改为带概率/范围的表述。
      </div>

      {/* Card foot — 软化建议 → button */}
      <button
        data-testid="xin-hover-card-soften"
        onClick={() => {
          // Use the existing pre-seeded "看心标出来那句怎么改" intent
          // (kanshan-followups.ts) by opening voice-diff in xin-soften mode.
          openTab('voice-diff', '看墨 · 软化绝对化声明', {
            mode: 'polish',
            selection: { text: hover.excerpt, rect: hover.rect },
          });
          setHover(null);
        }}
        style={{
          width: '100%',
          border: '1px solid rgba(184,85,67,0.55)',
          background: 'rgba(184,85,67,0.08)',
          color: '#7A2A1F',
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 11,
          padding: '4px 8px',
          borderRadius: 4,
          cursor: 'pointer',
          letterSpacing: 0.3,
        }}
      >
        软化建议 →
      </button>
    </div>,
    document.body,
  );
}
