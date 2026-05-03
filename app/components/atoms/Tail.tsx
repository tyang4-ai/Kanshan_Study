'use client';
import type { FoxMeta } from '@/lib/foxes/registry';

interface TailProps {
  fox: FoxMeta;
  active?: boolean;
  size?: number;
  rotate?: number;
  originX?: number | string;
  originY?: number | string;
  zIndex?: number;
  onClick?: () => void;
}

export function Tail({
  fox,
  active = false,
  size = 110,
  rotate = 0,
  originX,
  originY,
  zIndex = 1,
  onClick,
}: TailProps) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={fox.tailAsset}
      alt={`${fox.name} 尾`}
      onClick={onClick}
      style={{
        position: 'absolute',
        left: originX,
        top: originY,
        width: size,
        height: size * (74 / 80),
        transform: `translate(-50%, -100%) rotate(${rotate}deg)`,
        transformOrigin: '50% 100%',
        cursor: onClick ? 'pointer' : 'default',
        zIndex,
        transition: 'filter .25s, transform .35s cubic-bezier(.2,.7,.3,1)',
        filter: active
          ? `drop-shadow(0 0 10px ${fox.glowSoft}) drop-shadow(0 0 20px ${fox.glow})`
          : 'drop-shadow(0 1px 2px rgba(0,0,0,.25))',
        pointerEvents: onClick ? 'auto' : 'none',
      }}
    />
  );
}
