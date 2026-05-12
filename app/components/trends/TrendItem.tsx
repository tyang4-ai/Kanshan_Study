'use client';
import { useState, type CSSProperties } from 'react';
import { useLastVisitStore } from '@/lib/store/last-visit';

export interface TrendItemProps {
  rank: number;
  title: string;
  heat: string;
  ageLabel: string;
  tags: string[];
  hot: boolean;
  vibes: string;
  // R2 judge fix (吴伟 P0 2026-05-12): clickable 原帖 link to the 知乎 source.
  url?: string;
  onClick?: () => void;
  onPin?: () => void;
}

export function TrendItem({ rank, title, heat, ageLabel, tags, hot, vibes, url, onClick, onPin }: TrendItemProps) {
  const [hover, setHover] = useState(false);

  const rowStyle: CSSProperties = {
    padding: '10px 14px',
    borderBottom: '1px solid rgba(23,114,246,0.10)',
    cursor: 'pointer',
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    transition: 'background .15s',
    background: hover ? '#F4F7FB' : 'transparent',
  };

  const rankStyle: CSSProperties = {
    flexShrink: 0,
    width: 22,
    fontSize: 13,
    fontWeight: 700,
    color: rank <= 3 ? '#1772F6' : '#7A8B9F',
    fontFamily: 'JetBrains Mono, monospace',
    textShadow: 'none',
  };

  const titleStyle: CSSProperties = {
    fontSize: 12.5,
    color: '#1A1F2A',
    lineHeight: 1.45,
    fontFamily: '"Noto Serif SC", serif',
    fontWeight: 500,
    marginBottom: 3,
  };

  const hotBadgeStyle: CSSProperties = {
    marginLeft: 4,
    fontSize: 10,
    padding: '0 5px',
    borderRadius: 2,
    background: '#1772F6',
    color: '#fff',
    verticalAlign: 'middle',
    fontFamily: 'JetBrains Mono, monospace',
    letterSpacing: 0.5,
  };

  const metaStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 9.5,
    color: '#7A8B9F',
    fontFamily: 'JetBrains Mono, monospace',
    letterSpacing: 0.4,
  };

  const tagStyle: CSSProperties = {
    padding: '0 5px',
    borderRadius: 2,
    background: '#E8F1FE',
    color: '#1772F6',
    fontFamily: '"Noto Sans SC", sans-serif',
  };

  const vibesStyle: CSSProperties = {
    marginTop: 6,
    fontSize: 10.5,
    color: '#5A6270',
    fontFamily: '"Noto Sans SC", sans-serif',
    fontStyle: 'italic',
    paddingLeft: 8,
    borderLeft: '2px solid rgba(23,114,246,0.40)',
  };

  return (
    <div
      data-testid="trend-item"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={rowStyle}
    >
      <span style={rankStyle}>{String(rank).padStart(2, '0')}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={titleStyle}>
          {title}
          {hot && <span style={hotBadgeStyle}>HOT</span>}
        </div>
        <div style={metaStyle}>
          <span>{heat}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{ageLabel}</span>
          {tags.map((tag, i) => (
            <span key={i} style={tagStyle}>{tag}</span>
          ))}
        </div>
        {vibes && <div style={vibesStyle}>{vibes}</div>}
      </div>
      {url && hover && (
        <a
          data-testid="trend-source-link"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            // R3 (吴伟 P2 2026-05-12): trend → 知乎 outbound埋点. Counts how
            // many times 答主 used 看势 as a one-tap on-ramp back to 知乎
            // source posts. Surfaces in StatsTab as "从看势导流 N 次".
            useLastVisitStore.getState().incrementTrendOutbound();
          }}
          aria-label="打开知乎原帖"
          title="打开知乎原帖"
          style={{
            alignSelf: 'center',
            flexShrink: 0,
            padding: '3px 8px',
            background: 'transparent',
            border: '1px solid rgba(23,114,246,0.5)',
            color: '#1772F6',
            fontFamily: '"Noto Serif SC", serif',
            fontSize: 10,
            letterSpacing: 0.5,
            borderRadius: 2,
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          → 原帖
        </a>
      )}
      {onPin && hover && (
        <button
          type="button"
          data-testid="trend-pin-btn"
          aria-label="钉到便签板"
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
          style={{
            alignSelf: 'center',
            flexShrink: 0,
            padding: '3px 8px',
            background: 'transparent',
            border: '1px solid rgba(23,114,246,0.5)',
            color: '#1772F6',
            fontFamily: '"Noto Serif SC", serif',
            fontSize: 10,
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
