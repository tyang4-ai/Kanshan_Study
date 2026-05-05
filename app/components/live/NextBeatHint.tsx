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

const wrap: CSSProperties = {
  position: 'fixed',
  right: 16,
  top: 16,
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
        <span>← prev</span>
        <span>·</span>
        <span>next →</span>
        {idx === last && <span style={{ marginLeft: 'auto', color: '#A89B7E' }}>fin</span>}
      </div>
    </div>
  );
}
