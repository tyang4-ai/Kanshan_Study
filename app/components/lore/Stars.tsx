'use client';
import { useMemo } from 'react';

interface StarsProps {
  count: number;
}

interface Star {
  x: number; y: number;
  size: number;
  bright: number;
  dur: number; delay: number;
  tier: 'small' | 'large';
}

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function Stars({ count }: StarsProps) {
  const stars = useMemo<Star[]>(() => {
    const rand = seededRng(1729);
    const small: Star[] = Array.from({ length: count }, () => ({
      x: rand() * 100,
      y: rand() * 60,
      size: 0.6 + rand() * 0.6,
      bright: 0.4 + rand() * 0.3,
      dur: 3 + rand() * 4,
      delay: rand() * 4,
      tier: 'small' as const,
    }));
    const large: Star[] = Array.from({ length: 12 }, () => ({
      x: rand() * 100,
      y: rand() * 50,
      size: 1.6 + rand() * 0.6,
      bright: 0.85,
      dur: 4 + rand() * 3,
      delay: rand() * 3,
      tier: 'large' as const,
    }));
    return [...small, ...large];
  }, [count]);

  return (
    <div
      data-testid="stars-layer"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      aria-hidden
    >
      {stars.map((s, i) => (
        <div
          key={i}
          data-testid="star"
          data-star-tier={s.tier}
          style={{
            position: 'absolute',
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size,
            borderRadius: s.size,
            background: '#FFFFFF',
            opacity: s.bright,
            boxShadow: s.tier === 'large'
              ? `0 0 ${s.size * 3}px rgba(255,255,255,${s.bright * 0.7})`
              : 'none',
            animation: `starTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}
