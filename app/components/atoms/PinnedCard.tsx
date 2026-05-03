import type { CSSProperties, ReactNode } from 'react';
import { Pushpin } from './Pushpin';

interface PinnedCardProps {
  rotate?: number;
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  width?: number;
  pinColor?: string;
  children: ReactNode;
  style?: CSSProperties;
}

export function PinnedCard({
  rotate = -1.5,
  top, left, right, bottom,
  width = 180,
  pinColor = '#C03028',
  children,
  style = {},
}: PinnedCardProps) {
  return (
    <div style={{
      position: 'absolute', top, left, right, bottom, width,
      transform: `rotate(${rotate}deg)`,
      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.18)) drop-shadow(0 1px 2px rgba(0,0,0,.12))',
    }}>
      <div style={{
        position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', zIndex: 2,
      }}>
        <Pushpin color={pinColor} />
      </div>
      <div style={{
        background: '#FAF6EC',
        backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,.5), transparent 30%), repeating-linear-gradient(90deg, rgba(120,90,60,.04) 0 1px, transparent 1px 4px)',
        padding: '14px 12px 12px',
        ...style,
      }}>
        {children}
      </div>
    </div>
  );
}
