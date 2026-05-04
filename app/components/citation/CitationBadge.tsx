'use client';
import type { CSSProperties, MouseEvent } from 'react';
import { citationLabel, type Citation } from '@/lib/citation/types';

interface CitationBadgeProps {
  citation: Citation;
  onClick?: (e: MouseEvent) => void;
  className?: string;
  'aria-describedby'?: string;
}

const BASE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  verticalAlign: 'baseline',
  fontFamily: 'JetBrains Mono, monospace',
  letterSpacing: 0.4,
  border: 'none',
  cursor: 'pointer',
};

const WEB_STYLE: CSSProperties = {
  ...BASE,
  width: 14,
  height: 14,
  borderRadius: '50%',
  background: '#1772F6',
  color: '#fff',
  fontSize: 9,
  padding: 0,
};

const VAULT_STYLE: CSSProperties = {
  ...BASE,
  borderRadius: 2,
  background: '#8B4513',
  color: '#F4E8D8',
  padding: '0 4px',
  fontSize: 9.5,
};

const ZHIHU_STYLE: CSSProperties = {
  ...BASE,
  borderRadius: 3,
  background: '#C03028',
  color: '#fff',
  padding: '0 6px',
  fontSize: 9.5,
};

function styleFor(kind: Citation['kind']): CSSProperties {
  if (kind === 'web') return WEB_STYLE;
  if (kind === 'vault') return VAULT_STYLE;
  return ZHIHU_STYLE;
}

export function CitationBadge({
  citation,
  onClick,
  className,
  'aria-describedby': ariaDescribedBy,
}: CitationBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      data-testid="citation-badge"
      data-kind={citation.kind}
      aria-describedby={ariaDescribedBy}
      style={styleFor(citation.kind)}
    >
      {citationLabel(citation)}
    </button>
  );
}
