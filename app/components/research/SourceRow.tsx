'use client';
import { useState, type CSSProperties } from 'react';

interface SourceRowProps {
  source: {
    kind: 'web' | 'vault' | 'zhihu';
    id: string;
    label: string;
    text: string;
    host: string;
    url?: string;
    articleId?: string;
  };
  onClick?: () => void;
  onPin?: () => void;
}

const badgeStyle = (kind: string): CSSProperties => {
  if (kind === 'web')   return { background: '#E6EFFB', color: '#1772F6' };
  if (kind === 'vault') return { background: '#F4E8D8', color: '#8B4513' };
  return { background: '#F8E0DD', color: '#C03028' };
};

export function SourceRow({ source, onClick, onPin }: SourceRowProps) {
  const [hover, setHover] = useState(false);
  return (
    <div
      data-testid="research-source-row"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 0', fontSize: 11,
        fontFamily: '"Noto Sans SC", sans-serif',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span style={{
        ...badgeStyle(source.kind),
        padding: '1px 6px', borderRadius: 2, fontSize: 9.5,
        fontFamily: 'JetBrains Mono, monospace',
        flexShrink: 0, letterSpacing: 0.3,
      }}>{source.label}</span>
      <span style={{ flex: 1, color: '#1A1F2A' }}>{source.text}</span>
      <span style={{ fontSize: 9.5, color: '#7A8B9F', fontFamily: 'JetBrains Mono, monospace' }}>{source.host}</span>
      {onPin && hover && (
        <button
          type="button"
          data-testid="research-pin-btn"
          aria-label="钉到便签板"
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
          style={{
            flexShrink: 0,
            padding: '2px 6px',
            background: 'transparent',
            border: '1px solid rgba(23,114,246,0.4)',
            color: '#1772F6',
            fontFamily: '"Noto Serif SC", serif',
            fontSize: 9,
            letterSpacing: 1,
            borderRadius: 2,
            cursor: 'pointer',
          }}
        >
          钉
        </button>
      )}
    </div>
  );
}
