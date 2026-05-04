'use client';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useProvenanceStore, type ProvenanceKind } from '@/lib/store/provenance';

const wrapperStyle: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-end',
  gap: 12,
  padding: '32px 0 18px',
  background:
    'linear-gradient(to bottom, rgba(250,248,243,0) 0%, rgba(250,248,243,0.92) 55%, #FAF8F3 100%)',
  pointerEvents: 'none',
};

const stampStyle: CSSProperties = {
  fontFamily: 'JetBrains Mono, "Noto Sans SC", sans-serif',
  fontSize: 10.5,
  color: '#7A6655',
  letterSpacing: 0.6,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const sepStyle: CSSProperties = { opacity: 0.5 };
const timeStyle: CSSProperties = { opacity: 0.7 };

function formatTime(d: Date): string {
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function ComplianceStamp() {
  const entries = useProvenanceStore((s) => s.entries);
  const counts = useMemo(() => {
    const c: Record<ProvenanceKind, number> = {
      'ai-touched': 0,
      claim: 0,
      hedge: 0,
      sourced: 0,
      flagged: 0,
    };
    for (const e of entries) c[e.kind]++;
    return c;
  }, [entries]);

  const items: string[] = [];
  if (counts.hedge > 0) items.push(`${counts.hedge} 处声明软化`);
  if (counts.flagged > 0) items.push(`${counts.flagged} 处出处待补`);
  if (counts['ai-touched'] > 0) items.push(`${counts['ai-touched']} 处 AI 协作段落`);
  if (counts.sourced > 0) items.push(`${counts.sourced} 处可溯引用`);
  if (counts.claim > 0) items.push(`${counts.claim} 处医学声明`);

  const hasItems = items.length > 0;
  // Time is computed client-side only to avoid SSR/CSR hydration mismatch.
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    setTime(formatTime(new Date()));
    const id = setInterval(() => setTime(formatTime(new Date())), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={wrapperStyle} data-testid="compliance-stamp">
      <div style={stampStyle}>
        <span>{hasItems ? '看心 · 已审' : '看心 · 待审'}</span>
        {items.map((it) => (
          <span key={it} style={{ display: 'contents' }}>
            <span style={sepStyle}>·</span>
            <span>{it}</span>
          </span>
        ))}
        {time && (
          <>
            <span style={sepStyle}>·</span>
            <span style={timeStyle} suppressHydrationWarning>{time}</span>
          </>
        )}
      </div>
    </div>
  );
}

export default ComplianceStamp;
