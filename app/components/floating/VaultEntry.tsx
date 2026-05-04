'use client';
import { useState } from 'react';

export interface VaultEntryData {
  id: string;
  title: string;
  snippet: string;
  year: string;
  date: string;
  words: number;
  borrows: number;
  draft?: boolean;
  tags: string[];
  spine?: string;
}

interface VaultEntryProps {
  entry: VaultEntryData;
  onOpen: (entry: VaultEntryData) => void;
}

export function VaultEntry({ entry, onOpen }: VaultEntryProps) {
  const [hover, setHover] = useState(false);
  return (
    <div
      data-testid={`vault-entry-${entry.id}`}
      data-article-id={entry.id}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        gap: 12,
        padding: '10px 8px',
        background: hover ? 'rgba(255,250,235,0.7)' : 'transparent',
        borderRadius: 2,
        marginBottom: 2,
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.15s',
      }}
    >
      {/* book-spine color tag */}
      <div
        style={{
          width: 4,
          alignSelf: 'stretch',
          borderRadius: 1,
          background: entry.spine || '#1772F6',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            marginBottom: 3,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#1A1815',
              fontFamily: '"Noto Serif SC", serif',
              letterSpacing: 0.5,
            }}
          >
            {entry.title}
          </span>
          {entry.draft && (
            <span
              style={{
                fontSize: 9,
                color: '#B85543',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: 0.5,
                padding: '0 4px',
                border: '1px solid #B8554355',
                borderRadius: 2,
              }}
            >
              未发表
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#3A3633',
            fontFamily: '"Noto Serif SC", serif',
            lineHeight: 1.55,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: 5,
          }}
        >
          {entry.snippet}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 9.5,
            color: '#1772F6',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: 0.5,
          }}
        >
          <span>{entry.date}</span>
          <span>·</span>
          <span>{entry.words} 字</span>
          <span>·</span>
          <span style={{ color: '#1A1F2A' }}>借阅 {entry.borrows} 次</span>
          <span style={{ flex: 1 }} />
          {entry.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              style={{
                padding: '0 5px',
                background: 'rgba(23,114,246,0.08)',
                borderRadius: 1,
                fontFamily: '"Noto Serif SC", serif',
                letterSpacing: 0.5,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      {/* hover-only "展卷" button */}
      <button
        aria-label={`展卷 ${entry.title}`}
        style={{
          alignSelf: 'center',
          flexShrink: 0,
          padding: '4px 10px',
          background: hover ? '#1772F6' : 'transparent',
          color: hover ? '#F4EAD0' : 'transparent',
          border: hover ? '1px solid #1772F6' : '1px solid transparent',
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 11,
          letterSpacing: 2,
          borderRadius: 2,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(entry);
        }}
      >
        展卷
      </button>
    </div>
  );
}
