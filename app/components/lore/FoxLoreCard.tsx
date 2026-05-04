'use client';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { getFox } from '@/lib/foxes/registry';
import type { FoxId } from '@/lib/foxes/registry';

interface FoxLoreCardProps {
  foxId: FoxId;
  lore: string;
}

const GOLD = 'rgba(168,155,126,0.55)';
const GOLD_FAINT = 'rgba(168,155,126,0.25)';

// Note: parent passes `key={foxId}` so the card remounts on fox change.
// This makes the fade-in straightforward — start at 0, mount-effect sets to 1.
export function FoxLoreCard({ foxId, lore }: FoxLoreCardProps) {
  const fox = getFox(foxId);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const wrap: CSSProperties = {
    width: 280,
    background: 'rgba(20,22,30,0.55)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: `1px solid ${GOLD_FAINT}`,
    padding: '14px 18px 16px',
    color: '#E6EFFF',
    fontFamily: '"Noto Serif SC", serif',
    boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
    opacity: mounted ? 1 : 0,
    transition: 'opacity 220ms cubic-bezier(.4,0,.2,1)',
  };

  return (
    <div data-testid="fox-lore-card" data-fox-id={foxId} style={wrap}>
      {/* Hairline gold rule, museum-colophon header marker */}
      <div
        data-testid="card-rule"
        style={{
          width: 40,
          height: 1,
          background: GOLD,
          margin: '2px auto 10px',
        }}
      />
      <div
        data-testid="card-name"
        style={{
          fontSize: 22,
          fontWeight: 600,
          textAlign: 'center',
          color: fox.glow,
          textShadow: `0 0 12px ${fox.glow}55`,
          letterSpacing: 1,
        }}
      >
        {fox.name}
      </div>
      <div
        data-testid="card-epithet"
        style={{
          fontSize: 11,
          fontStyle: 'italic',
          color: '#A89B7E',
          textAlign: 'center',
          marginTop: 4,
          letterSpacing: 1.5,
        }}
      >
        {fox.epithet}
      </div>
      <div
        data-testid="card-meta"
        style={{
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          color: '#9FB6D6',
          textAlign: 'center',
          marginTop: 4,
          opacity: 0.55,
          letterSpacing: 0.6,
        }}
      >
        {fox.species} · {fox.persona}
      </div>
      <div style={{ height: 12 }} />
      <div
        data-testid="card-lore"
        style={{
          fontSize: 13,
          lineHeight: 1.7,
          color: '#E6EFFF',
          maxWidth: 280,
          opacity: 0.92,
        }}
      >
        {lore}
      </div>
    </div>
  );
}
