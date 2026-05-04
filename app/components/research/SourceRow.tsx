'use client';
import type { CSSProperties } from 'react';

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
}

const badgeStyle = (kind: string): CSSProperties => {
  if (kind === 'web')   return { background: '#E6EFFB', color: '#1772F6' };
  if (kind === 'vault') return { background: '#F4E8D8', color: '#8B4513' };
  return { background: '#F8E0DD', color: '#C03028' };
};

export function SourceRow({ source, onClick }: SourceRowProps) {
  return (
    <div
      data-testid="research-source-row"
      onClick={onClick}
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
    </div>
  );
}
