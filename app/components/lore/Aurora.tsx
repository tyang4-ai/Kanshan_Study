'use client';
import type { CSSProperties } from 'react';

interface AuroraProps {
  hue: number;        // 0–360
  top: string;        // e.g. "18%"
  width: number;      // vw
  height: number;     // px
  dur: string;        // e.g. "22s"
  delay: string;      // e.g. "-3s"
  opacity: number;    // 0–1
  filterId: string;   // unique per instance for the feTurbulence filter
}

export function Aurora({ hue, top, width, height, dur, delay, opacity, filterId }: AuroraProps) {
  const colorA = `hsla(${hue}, 70%, 58%, ${opacity})`;
  const colorB = `hsla(${(hue + 18) % 360}, 65%, 64%, ${opacity * 0.85})`;

  const wrap: CSSProperties = {
    position: 'absolute',
    top,
    left: '50%',
    width: `${width}vw`,
    height,
    transform: 'translateX(-50%)',
    pointerEvents: 'none',
    mixBlendMode: 'screen',
  };

  const blob: CSSProperties = {
    position: 'absolute',
    inset: 0,
    background:
      `radial-gradient(ellipse 60% 50% at 30% 50%, ${colorA} 0%, transparent 70%),` +
      `radial-gradient(ellipse 50% 50% at 72% 50%, ${colorB} 0%, transparent 65%)`,
    filter: `blur(48px) url(#${filterId})`,
    animation: `auroraDrift ${dur} ${delay} cubic-bezier(.4,0,.6,1) infinite alternate`,
  };

  return (
    <div style={wrap} aria-hidden>
      {/* feTurbulence displacement gives the ribbon vertical striations
          rather than a smooth blurred oval. */}
      <svg
        width="0"
        height="0"
        style={{ position: 'absolute' }}
      >
        <defs>
          <filter id={filterId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.02 0.6"
              numOctaves={2}
              seed={hue}
            />
            <feDisplacementMap in="SourceGraphic" scale="4" />
          </filter>
        </defs>
      </svg>
      <div style={blob} />
    </div>
  );
}
