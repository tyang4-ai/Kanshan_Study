'use client';

// Two-pass mountain ridge — back ridge slightly higher and softer, front ridge
// slightly lower and crisper. Single-ridge silhouettes always read prototype-y.
export function Ridge() {
  return (
    <svg
      data-testid="ridge"
      viewBox="0 0 1600 320"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        bottom: '18%',
        left: 0,
        right: 0,
        width: '100%',
        height: '24%',
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      {/* Back ridge — higher, softer */}
      <path
        data-testid="ridge-back"
        d="M0 320 L0 200 L120 150 L260 190 L420 120 L580 170 L740 130 L900 190 L1060 130 L1220 180 L1380 140 L1500 180 L1600 150 L1600 320 Z"
        fill="#14253D"
        opacity={0.5}
      />
      {/* Front ridge — lower, crisper */}
      <path
        data-testid="ridge-front"
        d="M0 320 L0 250 L160 200 L320 230 L480 190 L640 240 L800 210 L960 250 L1120 220 L1280 260 L1440 230 L1600 250 L1600 320 Z"
        fill="#0E1B2C"
        opacity={0.85}
      />
    </svg>
  );
}
