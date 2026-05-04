'use client';
import { useState, type ReactNode } from 'react';
import { useFloatingWindowStore } from '@/lib/store/floating-window';

interface InlineVoiceMarkProps {
  children: ReactNode;
  sourceTitle: string;
  sourceDate: string;
  sourceArticleId: string;
}

export function InlineVoiceMark({ children, sourceTitle, sourceDate, sourceArticleId }: InlineVoiceMarkProps) {
  const [hover, setHover] = useState(false);
  const openTab = useFloatingWindowStore((s) => s.openTab);
  const onClick = () => {
    openTab('vault', '看典 · 档案库', { scrollToArticleId: sourceArticleId });
  };
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        background: 'rgba(31,139,102,0.08)',
        borderBottom: '1px solid #1F8B66',
        padding: '0 1px',
        cursor: 'help',
        position: 'relative',
      }}
    >
      {children}
      {hover && (
        <span style={{
          position: 'absolute', bottom: '100%', left: 0,
          background: '#1A1F2A', color: '#F4EAD0',
          padding: '4px 8px', borderRadius: 3,
          fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
          whiteSpace: 'nowrap',
          marginBottom: 4, zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          letterSpacing: 0.4,
        }}>据 {sourceTitle} ({sourceDate})</span>
      )}
    </span>
  );
}
