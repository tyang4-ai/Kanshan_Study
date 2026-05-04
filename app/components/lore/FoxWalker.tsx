'use client';

interface FoxWalkerProps {
  y: string;
  size: number;
  delay: string;
  dur: string;
  tone: 'graphite' | 'silver';
}

const TONE: Record<FoxWalkerProps['tone'], string> = {
  graphite: '#0A1428',
  silver:   '#1B2C44',
};

// Flat fox silhouette built specifically for the village scene — NOT reusing
// the rail tail-path assets. Pacing across the snow line at staggered speeds;
// alpha falloff + tiny blur reads as figure-in-fog rather than sticker.
export function FoxWalker({ y, size, delay, dur, tone }: FoxWalkerProps) {
  return (
    <div
      data-testid="fox-walker"
      style={{
        position: 'absolute',
        top: y,
        left: 0,
        animation: `foxWalk ${dur} ${delay} linear infinite`,
        pointerEvents: 'none',
        opacity: 0.55,
        filter: 'blur(0.6px)',
      }}
      aria-hidden
    >
      <svg
        width={size * 1.7}
        height={size}
        viewBox="0 0 34 20"
      >
        <g fill={TONE[tone]}>
          {/* Body */}
          <path d="M3 14 Q5 12 7 14 L9 12 L11 9 L13 6 L15 5 L17 5 L19 6 L20 8 L22 7 L25 9 L27 11 L29 14 Q31 16 29 17 L27 15.5 L25 16 L23 14.5 L21 14.5 L19 16 L17 14.5 L15 16 L13 14.5 L11 16 L9 14.5 L7 16 L5 15 Z"/>
          {/* Ear */}
          <path d="M14 5 L13.5 2.5 L15 4 Z"/>
          {/* Tail puff */}
          <path d="M27 12 Q30 10 32 11 Q31 14 28 14 Z"/>
        </g>
      </svg>
    </div>
  );
}
