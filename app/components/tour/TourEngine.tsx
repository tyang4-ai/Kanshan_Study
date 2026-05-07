'use client';
import type { CSSProperties } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TOUR_STEPS, type TourStep } from '@/lib/tour/steps';

interface TourEngineProps {
  onComplete: () => void;
  initialStep?: number;
}

interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const TOUR_DONE_KEY = 'kanshan-tour-done';

function findValidStepIndex(startIdx: number): number {
  for (let i = startIdx; i < TOUR_STEPS.length; i++) {
    const step = TOUR_STEPS[i];
    if (typeof document === 'undefined') return i;
    const el = document.querySelector(step.selector);
    if (el) return i;
  }
  return TOUR_STEPS.length;
}

function rectFromElement(el: Element): AnchorRect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

interface CardSize {
  w: number;
  h: number;
}

interface Viewport {
  w: number;
  h: number;
}

const SAFE_MARGIN = 8;

// Compute the card's top-left position (in fixed coordinates), clamped so the
// card always stays inside the viewport with at least SAFE_MARGIN on every
// edge. Returns null when no anchor exists — caller centers in that case.
function clampedTopLeft(
  rect: AnchorRect,
  side: TourStep['side'],
  card: CardSize,
  vp: Viewport,
): { top: number; left: number } {
  const gap = 14;
  let top: number;
  let left: number;

  switch (side) {
    case 'top':
      top = rect.top - gap - card.h;
      left = rect.left + rect.width / 2 - card.w / 2;
      break;
    case 'bottom':
      top = rect.top + rect.height + gap;
      left = rect.left + rect.width / 2 - card.w / 2;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - card.h / 2;
      left = rect.left - gap - card.w;
      break;
    case 'right':
    default:
      top = rect.top + rect.height / 2 - card.h / 2;
      left = rect.left + rect.width + gap;
      break;
  }

  // Viewport clamp — never let the card poke past any edge. Prevents the
  // STEP 2/8 bug where the editor anchor spans the full viewport and the
  // 'top' side would land the card at y=-29 (off-screen).
  const maxLeft = Math.max(SAFE_MARGIN, vp.w - card.w - SAFE_MARGIN);
  const maxTop = Math.max(SAFE_MARGIN, vp.h - card.h - SAFE_MARGIN);
  left = Math.max(SAFE_MARGIN, Math.min(maxLeft, left));
  top = Math.max(SAFE_MARGIN, Math.min(maxTop, top));

  return { top, left };
}

function centeredPosition(): CSSProperties {
  return {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  };
}

// Conservative defaults — used on the first render before the card mounts and
// we can measure it. These match the rendered card's typical dimensions
// (max-width 320, padding 14/18, up to ~5 lines of body text).
const DEFAULT_CARD: CardSize = { w: 320, h: 180 };

function readViewport(): Viewport {
  if (typeof window === 'undefined') return { w: 1024, h: 768 };
  return { w: window.innerWidth, h: window.innerHeight };
}

export function TourEngine({ onComplete, initialStep = 0 }: TourEngineProps) {
  const [stepIdx, setStepIdx] = useState(() => findValidStepIndex(initialStep));
  const [rect, setRect] = useState<AnchorRect | null>(null);
  const [cardSize, setCardSize] = useState<CardSize>(DEFAULT_CARD);
  const [vp, setVp] = useState<Viewport>(() => readViewport());
  const cardRef = useRef<HTMLDivElement | null>(null);
  // `appeared` mirrors stepIdx: starts false on every step change, flips true
  // after one rAF tick. Keyed by stepIdx to avoid set-state-in-effect.
  const [appearedFor, setAppearedFor] = useState<number>(-1);
  const appeared = appearedFor === stepIdx;

  // Re-locate on step change. Wrapped in rAF so the setState happens after
  // the layout commit rather than synchronously inside the effect body.
  useLayoutEffect(() => {
    if (stepIdx >= TOUR_STEPS.length) return;
    const raf = requestAnimationFrame(() => {
      const step = TOUR_STEPS[stepIdx];
      const el = typeof document !== 'undefined' ? document.querySelector(step.selector) : null;
      setRect(el ? rectFromElement(el) : null);
    });
    return () => cancelAnimationFrame(raf);
  }, [stepIdx]);

  // Reflow on resize/scroll. Also re-read the viewport on resize so the
  // viewport clamp tracks the live window dimensions.
  useEffect(() => {
    if (stepIdx >= TOUR_STEPS.length) return;
    const handler = () => {
      const step = TOUR_STEPS[stepIdx];
      const el = document.querySelector(step.selector);
      setRect(el ? rectFromElement(el) : null);
      setVp(readViewport());
    };
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [stepIdx]);

  // Measure the card after render so the clamp uses real dimensions, not the
  // conservative default. rAF lets the layout settle (text wrap, line breaks)
  // before we read getBoundingClientRect.
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    const raf = requestAnimationFrame(() => {
      const node = cardRef.current;
      if (!node) return;
      const r = node.getBoundingClientRect();
      const next: CardSize = {
        w: Math.ceil(r.width) || DEFAULT_CARD.w,
        h: Math.ceil(r.height) || DEFAULT_CARD.h,
      };
      setCardSize((prev) =>
        prev.w === next.w && prev.h === next.h ? prev : next,
      );
    });
    return () => cancelAnimationFrame(raf);
  }, [stepIdx, rect, vp.w, vp.h]);

  // Card transition: opacity 0→1 + translateY(8 → 0). Raf sets appearedFor
  // to current stepIdx after the initial 0/8px frame is committed.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAppearedFor(stepIdx));
    return () => cancelAnimationFrame(raf);
  }, [stepIdx]);

  const finish = () => {
    try {
      window.localStorage.setItem(TOUR_DONE_KEY, new Date().toISOString());
    } catch {
      // localStorage may be unavailable; ignore
    }
    onComplete();
  };

  const handleNext = () => {
    const next = findValidStepIndex(stepIdx + 1);
    if (next >= TOUR_STEPS.length) {
      finish();
      return;
    }
    setStepIdx(next);
  };

  const handleSkip = () => {
    finish();
  };

  // If we ran past the last step (e.g. mounted with all selectors missing),
  // fall back to the final step as a centered card so the overlay is still
  // visible — user can dismiss with 跳过.
  const safeIdx = stepIdx >= TOUR_STEPS.length ? TOUR_STEPS.length - 1 : stepIdx;
  const step = TOUR_STEPS[safeIdx];

  const backdrop: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(20,22,30,0.3)',
    zIndex: 4500,
    pointerEvents: 'auto',
  };

  // Cutout via 4 quadrants when rect is known. Each quadrant covers an area
  // outside the highlight rect.
  const cutoutBg = 'rgba(20,22,30,0.3)';
  const quadrantStyles: CSSProperties[] = rect
    ? [
        // top
        { position: 'fixed', top: 0, left: 0, right: 0, height: rect.top, background: cutoutBg },
        // bottom
        {
          position: 'fixed',
          top: rect.top + rect.height,
          left: 0,
          right: 0,
          bottom: 0,
          background: cutoutBg,
        },
        // left
        {
          position: 'fixed',
          top: rect.top,
          left: 0,
          width: rect.left,
          height: rect.height,
          background: cutoutBg,
        },
        // right
        {
          position: 'fixed',
          top: rect.top,
          left: rect.left + rect.width,
          right: 0,
          height: rect.height,
          background: cutoutBg,
        },
      ]
    : [];

  // Position: when no anchor, center the card. When anchor exists, clamp the
  // computed top-left so the card always stays inside the viewport with at
  // least SAFE_MARGIN (8px) on every edge.
  const positionStyles: CSSProperties = rect
    ? (() => {
        const { top, left } = clampedTopLeft(rect, step.side, cardSize, vp);
        return { position: 'fixed', top, left };
      })()
    : centeredPosition();

  const isCentered = !rect;

  const card: CSSProperties = {
    ...positionStyles,
    zIndex: 4501,
    background: 'rgba(20,22,30,0.92)',
    border: '1px solid rgba(168,155,126,0.45)',
    borderRadius: 2,
    padding: '14px 18px',
    maxWidth: 320,
    color: '#E6EFFF',
    fontFamily: '"Noto Serif SC", serif',
    fontSize: 13,
    lineHeight: 1.6,
    boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
    opacity: appeared ? 1 : 0,
    // When centered (no rect), preserve the translate(-50%, -50%) anchor.
    // When clamped (rect known), top/left already point at the card's top-left
    // corner, so transform only carries the appearance translateY.
    transform: isCentered
      ? `translate(-50%, -50%) translateY(${appeared ? '0' : '8px'})`
      : `translateY(${appeared ? '0' : '8px'})`,
    transition: 'opacity 280ms cubic-bezier(.16,.84,.24,1), transform 280ms cubic-bezier(.16,.84,.24,1)',
  };

  const stepIndicator: CSSProperties = {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 9,
    letterSpacing: 1.5,
    color: 'rgba(168,155,126,0.7)',
    marginBottom: 6,
  };

  const titleStyle: CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 2,
    marginBottom: 6,
    color: '#E6EFFF',
  };

  const bodyStyle: CSSProperties = {
    color: '#C5D2E2',
    fontSize: 12,
    lineHeight: 1.7,
  };

  const actions: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  };

  const nextBtn: CSSProperties = {
    background: 'rgba(168,155,126,0.18)',
    border: '1px solid rgba(168,155,126,0.5)',
    color: '#E6EFFF',
    padding: '4px 12px',
    fontSize: 11,
    letterSpacing: 2,
    fontFamily: '"Noto Serif SC", serif',
    cursor: 'pointer',
    borderRadius: 2,
  };

  const skipBtn: CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'rgba(197,210,226,0.6)',
    padding: '4px 0',
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: '"Noto Serif SC", serif',
    cursor: 'pointer',
  };

  return (
    <div data-testid="tour-overlay" style={{ position: 'fixed', inset: 0, zIndex: 4500 }}>
      {rect ? (
        quadrantStyles.map((s, i) => (
          <div key={i} data-testid={`tour-cutout-${i}`} style={s} />
        ))
      ) : (
        <div data-testid="tour-backdrop" style={backdrop} />
      )}

      <div
        ref={cardRef}
        data-testid="tour-card"
        data-step-id={step.id}
        data-step-idx={stepIdx}
        style={card}
      >
        <div data-testid={`tour-step-${step.id}`} />
        <div style={stepIndicator}>STEP {Math.min(safeIdx + 1, TOUR_STEPS.length)}/{TOUR_STEPS.length}</div>
        <div style={titleStyle}>{step.title}</div>
        <div style={bodyStyle}>{step.body}</div>
        <div style={actions}>
          <button
            data-testid="tour-skip"
            onClick={handleSkip}
            style={skipBtn}
          >
            跳过
          </button>
          <button
            data-testid="tour-next"
            onClick={handleNext}
            style={nextBtn}
          >
            下一步 →
          </button>
        </div>
      </div>
    </div>
  );
}
