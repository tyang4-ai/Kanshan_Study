import { BODY_ASSET } from '@/lib/foxes/registry';

interface ShanFigureProps {
  size?: number;
  glow?: boolean;
}

export function ShanFigure({ size = 120, glow = false }: ShanFigureProps) {
  const w = size;
  const h = size * 1.24;
  return (
    <div style={{ position: 'relative', width: w, height: h, display: 'inline-block' }}>
      {glow && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)',
            width: w * 0.88,
            height: h * 0.94,
            borderRadius: '50%',
            background: '#E8B533',
            opacity: 0.18,
            filter: 'blur(8px)',
            pointerEvents: 'none',
          }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BODY_ASSET}
        alt="刘看山"
        width={w}
        height={h}
        style={{ position: 'relative', display: 'block', width: w, height: h }}
      />
    </div>
  );
}
