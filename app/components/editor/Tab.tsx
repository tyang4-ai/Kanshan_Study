'use client';

import type { CSSProperties, MouseEvent } from 'react';

export type TabProps = {
  filename: string;
  active: boolean;
  dirty: boolean;
  onClick?: () => void;
  /** Fired when the user clicks the × button. Stops propagation so the tab
   *  isn't also activated by the same click. */
  onClose?: () => void;
};

export function Tab({ filename, active, dirty, onClick, onClose }: TabProps) {
  const outerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 14px',
    height: 30,
    background: active ? '#FAF8F3' : 'transparent',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderTop: active ? '1px solid rgba(0,0,0,0.08)' : 'none',
    borderLeft: active ? '1px solid rgba(0,0,0,0.08)' : 'none',
    borderRight: active ? '1px solid rgba(0,0,0,0.08)' : 'none',
    fontSize: 12,
    color: active ? '#1A1F2A' : '#7A6655',
    fontFamily: 'JetBrains Mono, "Noto Sans SC", sans-serif',
    cursor: 'pointer',
    position: 'relative',
    top: 1,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  };

  const dotStyle: CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: 3,
    background: dirty ? '#1772F6' : 'transparent',
  };

  const closeBtnStyle: CSSProperties = {
    marginLeft: 6,
    opacity: 0.5,
    fontSize: 14,
    lineHeight: 1,
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    padding: '0 2px',
    borderRadius: 2,
  };

  const handleClose = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onClose?.();
  };

  return (
    <div
      data-testid="tab"
      data-active={active}
      onClick={onClick}
      style={outerStyle}
    >
      <span data-testid="tab-dirty-dot" style={dotStyle} />
      {filename}
      <button
        type="button"
        data-testid="tab-close"
        aria-label="关闭"
        onClick={handleClose}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.5'; }}
        style={closeBtnStyle}
      >
        ×
      </button>
    </div>
  );
}

export default Tab;
