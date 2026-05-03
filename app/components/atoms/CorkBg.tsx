import type { CSSProperties, ReactNode } from 'react';

interface CorkBgProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

const NOISE_URL = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.6' numOctaves='2' seed='3'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.30  0 0 0 0 0.18  0 0 0 0.55 0'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.85'/></svg>")`;

export function CorkBg({ children, style = {}, className = '' }: CorkBgProps) {
  return (
    <div className={className} style={{
      position: 'relative',
      background: 'linear-gradient(180deg, #C99566 0%, #B98050 50%, #A66B3D 100%)',
      backgroundBlendMode: 'multiply',
      ...style,
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: NOISE_URL,
        backgroundSize: '200px 200px',
        opacity: 0.85,
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.18) 100%)',
        pointerEvents: 'none',
      }}/>
      <div style={{ position: 'relative', height: '100%' }}>{children}</div>
    </div>
  );
}
