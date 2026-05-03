'use client';

import { useState, type ReactNode, type MouseEvent } from 'react';

interface MenuItemProps {
  icon?: ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  submenu?: ReactNode;
  /**
   * Optional hex color (e.g. fox.glow) used to tint the hover background +
   * left-border, preserving the mockup's fox-affinity gradient. When omitted,
   * hover falls back to the native blue (#1772F6 / white text).
   * Signature extension beyond plan #4 prompt — preserves mockup fidelity per
   * conversion checklist rule #9.
   */
  accentColor?: string;
}

export function MenuItem({
  icon,
  label,
  shortcut,
  onClick,
  disabled = false,
  submenu,
  accentColor,
}: MenuItemProps) {
  const [hover, setHover] = useState(false);

  const showAccent = hover && !disabled && Boolean(accentColor);
  const showBlue = hover && !disabled && !accentColor;

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (disabled) return;
    if (submenu) return;
    onClick();
  };

  return (
    <div
      role="menuitem"
      aria-disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '5px 14px',
        gap: 10,
        background: showAccent
          ? `linear-gradient(90deg, ${accentColor}26 0%, ${accentColor}10 100%)`
          : showBlue
            ? '#1772F6'
            : 'transparent',
        color: showBlue ? '#fff' : disabled ? '#B0AEA8' : '#1A1F2A',
        cursor: disabled ? 'default' : 'pointer',
        position: 'relative',
        borderLeft: showAccent ? `2px solid ${accentColor}` : '2px solid transparent',
        paddingLeft: 12,
      }}
    >
      {icon ?? <span style={{ width: 14, flexShrink: 0 }} />}

      <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{label}</span>

      {submenu ? (
        <span style={{ fontSize: 10, color: disabled ? '#B0AEA8' : '#7A8595' }}>▸</span>
      ) : shortcut ? (
        <span
          style={{
            fontSize: 11,
            color: showBlue ? 'rgba(255,255,255,0.7)' : '#7A8595',
            fontFamily: 'JetBrains Mono, monospace',
            marginLeft: 'auto',
          }}
        >
          {shortcut}
        </span>
      ) : null}

      {submenu}
    </div>
  );
}
