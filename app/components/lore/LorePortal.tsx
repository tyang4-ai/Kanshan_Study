'use client';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Aurora } from './Aurora';
import { Stars } from './Stars';
import { Snow } from './Snow';
import { Ridge } from './Ridge';
import { FoxWalker } from './FoxWalker';
import { House, type VillageEntry } from './House';
import { FoxLoreCard } from './FoxLoreCard';
import { getFox } from '@/lib/foxes/registry';
import type { FoxId } from '@/lib/foxes/registry';
import villageData from '@/content/lore/village.json';

const VILLAGE = villageData as VillageEntry[];

interface LorePortalProps {
  onClose: () => void;
}

type Phase = 'arriving' | 'here' | 'leaving';

interface MetMark {
  id: FoxId;
  t: number;
}

// One small px nudge between each pair to break the grid and read organic.
// Index 0..8 = left margin applied to that house.
const HOUSE_OFFSETS = [0, 6, 14, 4, 8, 4, 14, 6, 0];

const SKY_GRADIENT =
  'linear-gradient(180deg, #0A1226 0%, #0C1730 30%, #0E1B2C 70%, #14253D 100%)';

export function LorePortal({ onClose }: LorePortalProps) {
  const [phase, setPhase] = useState<Phase>('arriving');
  const [hoveredFox, setHoveredFoxState] = useState<FoxId | null>(null);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [met, setMet] = useState<MetMark | null>(null);

  // Mount → arrive → here. Single rAF tick is enough for the browser to commit
  // the initial 0/0.96 frame before transitioning to 1/1.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase('here'));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Single setter that also dismisses the hint on first non-null hover.
  // Avoids the cascading-render lint rule that fires when set-state-in-effect.
  const setHoveredFox = (id: FoxId | null) => {
    setHoveredFoxState(id);
    if (id && !hintDismissed) setHintDismissed(true);
  };

  // Toast lifetime: each new MetMark replaces (clear+restart), never stacks.
  useEffect(() => {
    if (!met) return;
    const t = window.setTimeout(() => setMet(null), 2400);
    return () => window.clearTimeout(t);
  }, [met]);

  const handleClose = () => {
    setPhase('leaving');
    window.setTimeout(onClose, 380);
  };

  const visible = phase === 'here';
  const portalOpacity = phase === 'arriving' ? 0 : phase === 'leaving' ? 0 : 1;
  const portalScale = phase === 'arriving' ? 0.96 : phase === 'leaving' ? 0.98 : 1;

  const shan = getFox('shan');
  const ipFooterText = `${shan.attribution ?? ''}, 其余八狐为原创设定`;

  const root: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 3000,
    background: SKY_GRADIENT,
    overflow: 'hidden',
    cursor: 'default',
    pointerEvents: phase === 'leaving' ? 'none' : 'auto',
    opacity: portalOpacity,
    transform: `scale(${portalScale})`,
    transformOrigin: 'center center',
    transition: 'opacity 360ms cubic-bezier(.4,0,.2,1), transform 360ms cubic-bezier(.4,0,.2,1)',
  };

  return (
    <div data-testid="lore-portal" style={root}>
      {/* Layer 1: stars (top 60% of sky) */}
      <Stars count={80} />

      {/* Layer 2: aurora ribbons */}
      <Aurora hue={195} top="18%" width={140} height={180} dur="22s" delay="0s"   opacity={0.55} filterId="aurora-cyan"   />
      <Aurora hue={270} top="24%" width={120} height={160} dur="28s" delay="-3s"  opacity={0.42} filterId="aurora-violet" />
      <Aurora hue={155} top="14%" width={160} height={200} dur="18s" delay="-7s"  opacity={0.38} filterId="aurora-jade"   />

      {/* Layer 3: mountain ridge — two passes */}
      <Ridge />

      {/* Layer 4: snow ground plane (with paper-grain feTurbulence overlay) */}
      <div
        data-testid="snow-ground"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '18%',
          background: 'linear-gradient(180deg, #C9D6E8 0%, #ABB9D0 50%, #8FA3BD 100%)',
          boxShadow: 'inset 0 8px 24px rgba(255,255,255,0.06)',
        }}
      >
        <svg
          width="0"
          height="0"
          aria-hidden
          style={{ position: 'absolute' }}
        >
          <defs>
            <filter id="paper-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} />
              <feColorMatrix values="0 0 0 0 0.95  0 0 0 0 0.97  0 0 0 0 1.00  0 0 0 0.06 0" />
            </filter>
          </defs>
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            filter: 'url(#paper-grain)',
            opacity: 0.5,
            pointerEvents: 'none',
            mixBlendMode: 'multiply',
          }}
          aria-hidden
        />
      </div>

      {/* Layer 5: village row */}
      <div
        data-testid="village-row"
        style={{
          position: 'absolute',
          bottom: '12%',
          left: '50%',
          transform: `translateX(-50%) ${visible ? 'translateY(0)' : 'translateY(40px)'}`,
          transition: 'transform 600ms cubic-bezier(.16,1,.3,1)',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 'clamp(12px, 2vw, 28px)',
          maxWidth: '94vw',
        }}
      >
        {VILLAGE.length === 0 ? null : VILLAGE.map((entry, i) => (
          <div
            key={entry.foxId}
            style={{ marginLeft: i === 0 ? 0 : HOUSE_OFFSETS[i] }}
          >
            <House
              entry={entry}
              hovered={hoveredFox === entry.foxId}
              onHover={setHoveredFox}
              onClick={() => setMet({ id: entry.foxId, t: Date.now() })}
            />
          </div>
        ))}
      </div>

      {/* Layer 6: walking fox silhouettes (in front of village row but behind snow particles) */}
      <FoxWalker y="80%" size={26} delay="0s"  dur="28s" tone="graphite" />
      <FoxWalker y="84%" size={32} delay="-9s" dur="34s" tone="silver" />

      {/* Layer 7: snowfall particles */}
      <Snow />

      {/* Top bar: close button (left) + sign (center) */}
      <button
        data-testid="lore-close"
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          padding: '8px 18px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.16)',
          color: '#E6EFFF',
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 13,
          letterSpacing: 4,
          borderRadius: 2,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 300ms 200ms cubic-bezier(.4,0,.2,1), background 200ms',
          zIndex: 10,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.13)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
      >
        ←&nbsp;回书桌
      </button>

      {/* Sign block */}
      <div
        data-testid="lore-sign"
        style={{
          position: 'absolute',
          top: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          color: '#E6EFFF',
          fontFamily: '"Noto Serif SC", serif',
          opacity: visible ? 1 : 0,
          transition: 'opacity 600ms 200ms cubic-bezier(.4,0,.2,1)',
        }}
      >
        <div
          style={{
            width: 220,
            height: 1,
            background: 'rgba(168,155,126,0.4)',
            margin: '0 auto 10px',
          }}
        />
        <div
          style={{
            fontSize: 9,
            letterSpacing: 6,
            color: '#9FB6D6',
            fontFamily: 'JetBrains Mono, monospace',
            fontVariant: 'small-caps',
            marginBottom: 6,
          }}
        >
          NORTH POLE · 87°N
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: 12,
            textShadow: '0 0 24px rgba(159,220,196,0.32)',
          }}
        >
          北极小镇
        </div>
        <div
          style={{
            fontSize: 11,
            marginTop: 4,
            color: '#9FB6D6',
            letterSpacing: 6,
            fontStyle: 'italic',
          }}
        >
          九狐之家 · 共此长夜
        </div>
        <div
          style={{
            width: 220,
            height: 1,
            background: 'rgba(168,155,126,0.4)',
            margin: '10px auto 0',
          }}
        />
      </div>

      {/* Lore card (only on hover) */}
      <div
        style={{
          position: 'absolute',
          top: '38vh',
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          zIndex: 5,
          opacity: hoveredFox ? 1 : 0,
          transition: 'opacity 220ms cubic-bezier(.4,0,.2,1)',
        }}
      >
        {hoveredFox && (
          <FoxLoreCard
            key={hoveredFox}
            foxId={hoveredFox}
            lore={VILLAGE.find((v) => v.foxId === hoveredFox)?.lore ?? ''}
          />
        )}
      </div>

      {/* Bottom-center hint (fades after first hover) */}
      <div
        data-testid="lore-hint"
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 78,
          transform: 'translateX(-50%)',
          fontSize: 11,
          color: '#9FB6D6',
          letterSpacing: 4,
          fontFamily: '"Noto Serif SC", serif',
          opacity: hintDismissed ? 0 : 0.4,
          transition: 'opacity 380ms cubic-bezier(.4,0,.2,1)',
          pointerEvents: 'none',
        }}
      >
        悬停房屋 · 与狐相见
      </div>

      {/* Toast on house click — replaces, never stacks */}
      <div
        data-testid="lore-toast"
        data-toast-active={met !== null}
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 48,
          transform: `translateX(-50%) translateY(${met ? 0 : 6}px)`,
          padding: '6px 16px',
          background: 'rgba(11,26,54,0.78)',
          border: '1px solid rgba(168,155,126,0.3)',
          color: '#E6EFFF',
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 11,
          letterSpacing: 2,
          borderRadius: 2,
          opacity: met ? 1 : 0,
          transition: 'opacity 220ms, transform 220ms',
          pointerEvents: 'none',
          zIndex: 20,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {met ? `遇见 ${getFox(met.id).name}` : ''}
      </div>

      {/* IP attribution footer */}
      <div
        data-testid="lore-ip-footer"
        style={{
          position: 'absolute',
          right: 16,
          bottom: 12,
          fontSize: 9,
          fontStyle: 'italic',
          color: 'rgba(230,239,255,0.5)',
          fontFamily: '"Noto Serif SC", serif',
          letterSpacing: 0.4,
          pointerEvents: 'none',
        }}
      >
        {ipFooterText}
      </div>
    </div>
  );
}
