import type { ReactNode } from 'react';

interface RelCardProps {
  children: ReactNode;
  rotate?: number;
  pinColor?: string;
  offsetX?: number;
}

export function RelCard({ children, rotate = 0, pinColor = '#1772F6', offsetX = 0 }: RelCardProps) {
  return (
    <div style={{
      position: 'relative',
      transform: `translateX(${offsetX}px) rotate(${rotate}deg)`,
      transformOrigin: 'top center',
      background: '#FEFCF6',
      padding: '14px 14px 12px',
      boxShadow: '0 2px 4px rgba(0,0,0,.10), 0 6px 14px rgba(0,0,0,.08)',
      borderRadius: 1
    }}>
      {/* Pin */}
      <div style={{
        position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)',
        width: 14, height: 14, borderRadius: 7,
        background: `radial-gradient(circle at 35% 30%, ${pinColor}ff 0%, ${pinColor}cc 50%, ${pinColor}88 100%)`,
        boxShadow: `0 1px 2px rgba(0,0,0,.4), inset 0 -1px 0 rgba(0,0,0,.25)`,
        zIndex: 2
      }} />
      {children}
    </div>
  );
}
