'use client';

import { useState, type MouseEvent } from 'react';

interface SubmenuItem {
  label: string;
  onClick: () => void;
}

interface SubmenuProps {
  items: SubmenuItem[];
}

export function Submenu({ items }: SubmenuProps) {
  return (
    <div
      role="menu"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: '100%',
        top: -6,
        marginLeft: 4,
        width: 220,
        background: 'rgba(248,248,247,0.96)',
        backdropFilter: 'blur(20px) saturate(1.4)',
        borderRadius: 8,
        boxShadow: '0 12px 40px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.15)',
        padding: '5px 0',
        zIndex: 1001,
      }}
    >
      {items.map((it, i) => (
        <SubmenuRow key={i} item={it} />
      ))}
    </div>
  );
}

function SubmenuRow({ item }: { item: SubmenuItem }) {
  const [hover, setHover] = useState(false);
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    item.onClick();
  };
  return (
    <div
      role="menuitem"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleClick}
      style={{
        padding: '5px 14px',
        background: hover ? '#1772F6' : 'transparent',
        color: hover ? '#fff' : '#1A1F2A',
        cursor: 'pointer',
        fontSize: 12.5,
      }}
    >
      {item.label}
    </div>
  );
}
