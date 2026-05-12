'use client';
// Asset-resolution choice (Phase #16 Track 3, 2026-05-11):
// LorePortal is a Client Component (owns hooks). The asset-resolver imports
// `node:fs`, so it cannot be called inline here. Resolution path = Option A
// (server parent → prop-drill): `app/page.tsx` (Server Component) calls
// `getLoreAssets()` from `./loreAssets.server.ts` and passes the map down via
// `WorkspaceShell` → `<LorePortal hutImages bgImage />`. Routes that don't
// pre-resolve (e.g. `/live` is `'use client'`) get `undefined`, and the
// procedural SVG + CSS-gradient fallback path keeps rendering as before.
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Aurora } from './Aurora';
import { Stars } from './Stars';
import { Snow } from './Snow';
import { Ridge } from './Ridge';
import { House, type VillageEntry } from './House';
import { FoxLoreCard } from './FoxLoreCard';
import { Signpost } from './Signpost';
import { TechDetailsPanel } from './TechDetailsPanel';
import { getFox } from '@/lib/foxes/registry';
import type { FoxId } from '@/lib/foxes/registry';
import villageData from '@/content/lore/village.json';

const VILLAGE = villageData as VillageEntry[];

interface LorePortalProps {
  onClose: () => void;
  /** Per-fox painted hut images, pre-resolved server-side. Missing entries fall back to the procedural SVG silhouette. */
  hutImages?: Partial<Record<FoxId, string>>;
  /** Painted background image URL, pre-resolved server-side. When absent, the existing CSS gradient + aurora stack renders alone. */
  bgImage?: string | null;
}

type Phase = 'arriving' | 'here' | 'leaving';

interface MetMark {
  id: FoxId;
}

// One small px nudge between each pair to break the grid and read organic.
// Index 0..8 = left margin applied to that house.
const HOUSE_OFFSETS = [0, 6, 14, 4, 8, 4, 14, 6, 0];

const SKY_GRADIENT =
  'linear-gradient(180deg, #0A1226 0%, #0C1730 30%, #0E1B2C 70%, #14253D 100%)';

export function LorePortal({ onClose, hutImages, bgImage }: LorePortalProps) {
  const [phase, setPhase] = useState<Phase>('arriving');
  const [hoveredFox, setHoveredFoxState] = useState<FoxId | null>(null);
  const [pinnedFox, setPinnedFox] = useState<FoxId | null>(null);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [met, setMet] = useState<MetMark | null>(null);
  const [techOpen, setTechOpen] = useState(false);
  const [cardX, setCardX] = useState<number | null>(null);

  const houseRefs = useRef(new Map<FoxId, HTMLElement>());

  // Mount → arrive → here. Single rAF tick is enough for the browser to commit
  // the initial 0/0.96 frame before transitioning to 1/1.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase('here'));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Single setter that also dismisses the hint on first non-null hover/focus.
  const setHoveredFox = (id: FoxId | null) => {
    setHoveredFoxState(id);
    if (id && !hintDismissed) setHintDismissed(true);
    if (id) {
      const el = houseRefs.current.get(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        setCardX(rect.left + rect.width / 2);
      }
    }
  };

  // Toggle pin: same fox → unpin; different fox → re-pin.
  const togglePin = (id: FoxId) => {
    setPinnedFox((prev) => (prev === id ? null : id));
    setMet({ id });
    if (!hintDismissed) setHintDismissed(true);
    const el = houseRefs.current.get(id);
    if (el) {
      const rect = el.getBoundingClientRect();
      setCardX(rect.left + rect.width / 2);
    }
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

  // Esc closes the portal · backdrop click clears any pinned fox.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // If the tech panel is open, let it handle its own Esc instead.
      if (techOpen) return;
      // If a fox is pinned, first Esc unpins; second Esc closes the portal.
      if (pinnedFox) {
        setPinnedFox(null);
        return;
      }
      handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedFox, techOpen]);

  const visible = phase === 'here';
  const portalOpacity = phase === 'arriving' ? 0 : phase === 'leaving' ? 0 : 1;
  const portalScale = phase === 'arriving' ? 0.96 : phase === 'leaving' ? 0.98 : 1;

  const shan = getFox('shan');
  const ipFooterText = `${shan.attribution ?? ''} · 其余八狐为原创设定`;

  // Active card = pinned (if any) > hovered.
  const activeFox = pinnedFox ?? hoveredFox;
  const activeEntry = activeFox
    ? VILLAGE.find((v) => v.foxId === activeFox)
    : null;

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
    <div
      data-testid="lore-portal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lore-title"
      style={root}
      onClick={(e) => {
        // Clicks on the portal background (not on a fox or close button) clear the pin.
        if (e.target === e.currentTarget && pinnedFox) setPinnedFox(null);
      }}
    >
      {/* Layer 0: painted background image (when available) — sits at the bottom
          of the z-stack so the existing gradient / aurora / snow / village
          layers continue to paint on top of it. */}
      {bgImage && (
        // Decorative full-bleed cover image; next/image overhead isn't warranted
        // for a once-per-portal-open background that's already pre-resolved.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          data-testid="lore-portal-bg-image"
          src={bgImage}
          alt=""
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Layer 1: stars (top 60% of sky) — count reduced from 80→40 for stream perf */}
      <Stars count={40} />

      {/* Layer 2: aurora ribbons — 3 ribbons; reduced opacity ranges. */}
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
        {VILLAGE.length === 0 ? null : (
          <>
            {VILLAGE.map((entry, i) => (
              <div
                key={entry.foxId}
                ref={(el) => {
                  if (el) houseRefs.current.set(entry.foxId, el);
                  else houseRefs.current.delete(entry.foxId);
                }}
                style={{ marginLeft: i === 0 ? 0 : HOUSE_OFFSETS[i] }}
              >
                <House
                  entry={entry}
                  hovered={activeFox === entry.foxId}
                  pinned={pinnedFox === entry.foxId}
                  onHover={setHoveredFox}
                  onClick={() => togglePin(entry.foxId)}
                  imageSrc={hutImages?.[entry.foxId]}
                />
              </div>
            ))}
            <Signpost onOpen={() => setTechOpen(true)} />
          </>
        )}
      </div>

      {/* Layer 6: snowfall particles (count reduced inside Snow component) */}
      <Snow />

      {/* Top bar: close button (left) */}
      <button
        type="button"
        data-testid="lore-close"
        aria-label="返回工作台"
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
        ←&nbsp;返回工作台
      </button>

      {/* Sign block — semantic h1 anchor for the dialog */}
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
        <h1
          id="lore-title"
          style={{
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: 12,
            textShadow: '0 0 24px rgba(159,220,196,0.32)',
            margin: 0,
          }}
        >
          北极小镇
        </h1>
        <div
          style={{
            fontSize: 11,
            marginTop: 4,
            color: '#9FB6D6',
            letterSpacing: 6,
            fontStyle: 'italic',
          }}
        >
          九尾各执其能 · 看山唯予所欲
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

      {/* Lore card — anchored to active house horizontally; centered fallback */}
      <div
        style={{
          position: 'absolute',
          top: '38vh',
          left: cardX !== null ? `${cardX}px` : '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          zIndex: 5,
          opacity: activeFox ? 1 : 0,
          transition: 'opacity 220ms cubic-bezier(.4,0,.2,1), left 220ms cubic-bezier(.4,0,.2,1)',
        }}
      >
        {activeEntry && (
          <FoxLoreCard
            key={activeEntry.foxId}
            foxId={activeEntry.foxId}
            lore={activeEntry.lore}
          />
        )}
      </div>

      {/* Bottom-center hint (fades after first hover/click) */}
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
        悬停或点选房屋 · 查看分工
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

      {/* IP attribution footer — bumped to 11px / opacity 0.7 for projector legibility */}
      <div
        data-testid="lore-ip-footer"
        style={{
          position: 'absolute',
          right: 16,
          bottom: 12,
          fontSize: 11,
          fontStyle: 'italic',
          color: 'rgba(230,239,255,0.7)',
          fontFamily: '"Noto Serif SC", serif',
          letterSpacing: 0.4,
          pointerEvents: 'none',
        }}
      >
        {ipFooterText}
      </div>

      {techOpen && <TechDetailsPanel onClose={() => setTechOpen(false)} />}
    </div>
  );
}
