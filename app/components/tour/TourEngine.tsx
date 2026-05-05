'use client';
import type { CSSProperties } from 'react';
import { useEffect, useLayoutEffect, useState } from 'react';
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

function cardPosition(rect: AnchorRect | null, side: TourStep['side']): CSSProperties {
  if (!rect) {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }
  const gap = 14;
  switch (side) {
    case 'top':
      return {
        position: 'fixed',
        top: Math.max(12, rect.top - gap),
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, -100%)',
      };
    case 'bottom':
      return {
        position: 'fixed',
        top: rect.top + rect.height + gap,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, 0)',
      };
    case 'left':
      return {
        position: 'fixed',
        top: rect.top + rect.height / 2,
        left: Math.max(12, rect.left - gap),
        transform: 'translate(-100%, -50%)',
      };
    case 'right':
    default:
      return {
        position: 'fixed',
        top: rect.top + rect.height / 2,
        left: rect.left + rect.width + gap,
        transform: 'translate(0, -50%)',
      };
  }
}

export function TourEngine({ onComplete, initialStep = 0 }: TourEngineProps) {
  const [stepIdx, setStepIdx] = useState(() => findValidStepIndex(initialStep));
  const [rect, setRect] = useState<AnchorRect | null>(null);
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

  // Reflow on resize/scroll.
  useEffect(() => {
    if (stepIdx >= TOUR_STEPS.length) return;
    const handler = () => {
      const step = TOUR_STEPS[stepIdx];
      const el = document.querySelector(step.selector);
      setRect(el ? rectFromElement(el) : null);
    };
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [stepIdx]);

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

  const card: CSSProperties = {
    ...cardPosition(rect, step.side),
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
    transform: `${cardPosition(rect, step.side).transform ?? ''} translateY(${appeared ? '0' : '8px'})`,
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
