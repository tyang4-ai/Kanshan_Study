'use client';
import { useMemo } from 'react';
import type { CSSProperties } from 'react';

interface SnowProps {
  count?: number;
}

interface Flake {
  x: number;
  size: number;
  opacity: number;
  dur: number;
  delay: number;
  drift: number; // vw
  tier: 'large' | 'mid' | 'small';
}

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Three depth tiers give parallax without a real parallax system.
function buildFlakes(): Flake[] {
  const rand = seededRng(8423);
  const tiers = [
    { count: 10, size: [4, 5],   opacity: 0.9,  dur: [8, 12],  tier: 'large' as const },
    { count: 10, size: [2, 3],   opacity: 0.6,  dur: [14, 18], tier: 'mid'   as const },
    { count: 6,  size: [1, 2],   opacity: 0.35, dur: [22, 28], tier: 'small' as const },
  ];
  const out: Flake[] = [];
  for (const t of tiers) {
    for (let i = 0; i < t.count; i++) {
      out.push({
        x: rand() * 100,
        size: t.size[0] + rand() * (t.size[1] - t.size[0]),
        opacity: t.opacity,
        dur: t.dur[0] + rand() * (t.dur[1] - t.dur[0]),
        delay: rand() * 12,
        drift: -10 + rand() * 20,
        tier: t.tier,
      });
    }
  }
  return out;
}

export function Snow({ count }: SnowProps) {
  const flakes = useMemo(() => {
    const all = buildFlakes();
    return typeof count === 'number' ? all.slice(0, count) : all;
  }, [count]);

  return (
    <div
      data-testid="snow-layer"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
      aria-hidden
    >
      {flakes.map((f, i) => (
        <div
          key={i}
          data-testid="snowflake"
          data-flake-tier={f.tier}
          style={{
            position: 'absolute',
            left: `${f.x}%`, top: '-5%',
            width: f.size, height: f.size,
            borderRadius: f.size,
            background: '#FFFFFF',
            opacity: f.opacity,
            animation: `snowFall ${f.dur}s ${f.delay}s linear infinite`,
            ['--drift']: `${f.drift}vw`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
