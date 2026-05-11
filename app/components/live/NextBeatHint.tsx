'use client';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useState } from 'react';
import script from '@/content/demo/script.json';

interface Beat {
  tStart: number;
  tLabel: string;
  title: string;
  body: string;
}

interface DemoScript {
  title: string;
  totalSeconds: number;
  beats: Beat[];
}

const SCRIPT = script as DemoScript;

// R4 presentation persona-review 2026-05-11 P0 (Sun Liwei): the script
// teleprompter at top-right collided with LoreEnvelope (also top-right at
// `top:88, right:22`). Moved to bottom-right *above* the LIVE DEMO chip
// (chip lives at `bottom:12`; we sit at `bottom:60` with a 4px gap).
const wrap: CSSProperties = {
  position: 'fixed',
  right: 16,
  bottom: 60,
  zIndex: 2500,
  width: 280,
  padding: '10px 14px 12px',
  background: 'rgba(20,22,30,0.78)',
  border: '1px solid rgba(168,155,126,0.35)',
  borderRadius: 2,
  color: '#E6EFFF',
  fontFamily: '"Noto Serif SC", serif',
  fontSize: 12,
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};

const monoTag: CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 9,
  letterSpacing: 1.2,
  color: '#9FB6D6',
  marginBottom: 4,
};

const titleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 4,
  letterSpacing: 1,
};

const bodyStyle: CSSProperties = {
  fontSize: 11.5,
  lineHeight: 1.55,
  color: 'rgba(230,239,255,0.85)',
};

const navStyle: CSSProperties = {
  marginTop: 8,
  display: 'flex',
  gap: 4,
  fontSize: 10,
  fontFamily: 'JetBrains Mono, monospace',
  color: 'rgba(159,182,214,0.55)',
  alignItems: 'center',
};

// R8 VC re-review (Lin Maohua) P0: prev / next labels in the teleprompter
// were plain SPANs with no click handler. Judges saw them, tried to click
// them, nothing happened, and concluded the script was cosmetic — costing
// demo coherence points. These are now real buttons.
const navBtnStyle: CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(159,182,214,0.25)',
  color: 'rgba(159,182,214,0.85)',
  padding: '2px 8px',
  borderRadius: 2,
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 10,
  cursor: 'pointer',
};
const navBtnDisabled: CSSProperties = {
  ...navBtnStyle,
  opacity: 0.35,
  cursor: 'not-allowed',
};

interface NextBeatHintProps {
  initialIdx?: number;
  autoAdvance?: boolean;
}

export function NextBeatHint({ initialIdx = 0, autoAdvance = false }: NextBeatHintProps) {
  const [idx, setIdx] = useState(initialIdx);
  const last = SCRIPT.beats.length - 1;
  const beat = SCRIPT.beats[idx];

  const advance = useCallback(() => setIdx((i) => Math.min(last, i + 1)), [last]);
  const retreat = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') advance();
      else if (e.key === 'ArrowLeft') retreat();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, retreat]);

  useEffect(() => {
    if (!autoAdvance) return;
    const next = SCRIPT.beats[idx + 1];
    if (!next) return;
    const delayMs = (next.tStart - beat.tStart) * 1000;
    const t = window.setTimeout(advance, delayMs);
    return () => window.clearTimeout(t);
  }, [autoAdvance, idx, beat.tStart, advance]);

  if (!beat) return null;

  return (
    <div data-testid="next-beat-hint" data-beat-idx={idx} style={wrap}>
      <div style={monoTag}>SCRIPT · {beat.tLabel} · {idx + 1} / {SCRIPT.beats.length}</div>
      <div style={titleStyle}>{beat.title}</div>
      <div style={bodyStyle}>{beat.body}</div>
      <div style={navStyle}>
        <button
          type="button"
          data-testid="next-beat-prev"
          onClick={retreat}
          disabled={idx === 0}
          style={idx === 0 ? navBtnDisabled : navBtnStyle}
        >
          ← prev
        </button>
        <button
          type="button"
          data-testid="next-beat-next"
          onClick={advance}
          disabled={idx === last}
          style={idx === last ? navBtnDisabled : navBtnStyle}
        >
          next →
        </button>
        {idx === last && <span style={{ marginLeft: 'auto', color: '#A89B7E' }}>fin</span>}
      </div>
    </div>
  );
}
