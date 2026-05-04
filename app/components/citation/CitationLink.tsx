'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { CitationBadge } from './CitationBadge';
import { buildCitationOnClick } from '@/lib/citation/click-router';
import type { Citation } from '@/lib/citation/types';

interface CitationLinkProps {
  citation: Citation;
  className?: string;
}

const HOVER_DELAY_MS = 150;

const CARD_STYLE: CSSProperties = {
  // CitationLink lives inside <p>, so the card and its inner blocks are spans
  // forced to display:block. Avoids the "<div> cannot be descendant of <p>" hydration error.
  display: 'block',
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 6,
  zIndex: 100,
  width: 320,
  background: '#FAFBFD',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 6,
  padding: '10px 12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
  fontSize: 12,
  color: '#1A1F2A',
  fontFamily: 'Noto Sans SC, sans-serif',
};

const HEADING_STYLE: CSSProperties = {
  display: 'block',
  fontWeight: 600,
  fontSize: 12,
  fontFamily: 'Noto Sans SC, sans-serif',
};

// `-webkit-box` is itself a block-level display value, so it satisfies "no <div> in <p>"
// because inner blocks are <span>s. (We use <span> tags + this display.)
const CLAMP_2_STYLE: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  marginTop: 4,
};

const CLAMP_3_STYLE: CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  marginTop: 4,
};

const FOOTER_STYLE: CSSProperties = {
  display: 'block',
  marginTop: 6,
  opacity: 0.6,
  fontSize: 10,
  fontFamily: 'JetBrains Mono, monospace',
};

const ZHIHU_FOOTER_STYLE: CSSProperties = {
  display: 'block',
  marginTop: 6,
  color: '#5A6270',
  fontSize: 10,
};

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function HoverCardContent({ citation }: { citation: Citation }) {
  if (citation.kind === 'web') {
    return (
      <span data-testid="citation-hover-card" style={CARD_STYLE}>
        <span style={HEADING_STYLE}>外链</span>
        <span style={CLAMP_2_STYLE}>{citation.title ?? citation.url}</span>
        <span style={FOOTER_STYLE}>{truncate(citation.url, 60)}</span>
      </span>
    );
  }
  if (citation.kind === 'vault') {
    return (
      <span data-testid="citation-hover-card" style={CARD_STYLE}>
        <span style={HEADING_STYLE}>{`书房 · ${citation.sourceTitle}`}</span>
        <span style={CLAMP_3_STYLE}>{citation.preview}</span>
      </span>
    );
  }
  // zhihu
  return (
    <span data-testid="citation-hover-card" style={CARD_STYLE}>
      <span style={HEADING_STYLE}>{`@${citation.displayName}`}</span>
      {citation.bio ? <span style={CLAMP_3_STYLE}>{citation.bio}</span> : null}
      <span style={ZHIHU_FOOTER_STYLE}>点击查看其知乎回答原文</span>
    </span>
  );
}

export function CitationLink({ citation, className }: CitationLinkProps) {
  const openTab = useFloatingWindowStore((s) => s.openTab);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onClick = buildCitationOnClick(citation, (props) =>
    openTab('vault', '看典 · 档案库', props),
  );

  const clearHoverTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearHoverTimer();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const handleMouseEnter = () => {
    clearHoverTimer();
    timerRef.current = setTimeout(() => setOpen(true), HOVER_DELAY_MS);
  };
  const handleMouseLeave = () => {
    clearHoverTimer();
    setOpen(false);
  };
  const handleFocus = () => {
    clearHoverTimer();
    setOpen(true);
  };
  const handleBlur = () => {
    clearHoverTimer();
    setOpen(false);
  };

  return (
    <span
      data-testid="citation-link"
      className={className}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <CitationBadge citation={citation} onClick={onClick} />
      {open ? <HoverCardContent citation={citation} /> : null}
    </span>
  );
}
