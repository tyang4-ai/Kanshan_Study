'use client';
import type { CSSProperties } from 'react';

interface SourceLite {
  kind: 'web' | 'vault' | 'zhihu';
  id: string;
  label: string;
  url?: string;
  articleId?: string;
}

interface CiteProps {
  source: SourceLite | null;
  onClick?: (source: SourceLite) => void;
}

const colorByKind: Record<SourceLite['kind'], string> = {
  web: '#1772F6',
  vault: '#8B4513',
  zhihu: '#C03028',
};

const supStyle = (color: string): CSSProperties => ({
  color,
  fontSize: 10,
  marginLeft: 1,
  cursor: 'pointer',
  fontFamily: 'JetBrains Mono, monospace',
});

export function Cite({ source, onClick }: CiteProps) {
  if (!source) return null;
  return (
    <sup
      data-testid="research-cite"
      data-cite-id={source.id}
      data-kind={source.kind}
      onClick={() => onClick?.(source)}
      style={supStyle(colorByKind[source.kind])}
    >
      {source.label}
    </sup>
  );
}
