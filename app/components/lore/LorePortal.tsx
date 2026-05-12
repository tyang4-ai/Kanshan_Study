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
import { useTweak } from '@/lib/store/tweak';

const VILLAGE = villageData as VillageEntry[];

interface LorePortalProps {
  onClose: () => void;
  /** Per-fox painted hut images, pre-resolved server-side. Missing entries fall back to the procedural SVG silhouette. */
  hutImages?: Partial<Record<FoxId, string>>;
  /** Painted background image URL, pre-resolved server-side. When absent, the existing CSS gradient + aurora stack renders alone. */
  bgImage?: string | null;
  /** R3 (史中 P1 2026-05-12): pre-pin a specific fox on open — used by the
   *  PublishPin 金尾 Easter egg to jump directly into 看心's village entry
   *  when clicked. */
  initialFoxId?: FoxId | null;
}

type Phase = 'arriving' | 'here' | 'leaving';

interface MetMark {
  id: FoxId;
}

// One small px nudge between each pair to break the grid and read organic.
// Index 0..8 = left margin applied to that house. Used by the legacy flex-row
// layout when no bg image is shipped.
const HOUSE_OFFSETS = [0, 6, 14, 4, 8, 4, 14, 6, 0];

const SKY_GRADIENT =
  'linear-gradient(180deg, #0A1226 0%, #0C1730 30%, #0E1B2C 70%, #14253D 100%)';

// Phase #16.7 (2026-05-12) — invisible click hotspots positioned over the
// buildings drawn into the panoramic bg. The bg IS the visual; the painted
// hut PNGs only fade in on hover/pin as a subtle "you can click here"
// affordance. Coords are CENTER (`cx`) + base (`by`, measured from bottom)
// of each building drawn in the 2360×1640 bg (Untitled_Artwork.png), and
// `h` is building height — all percentages.
interface BgPos {
  cx: number;     // % left of building center
  by: number;     // % from bottom — base of building
  h: number;      // % height of building
}
const BG_POSITIONS: Record<FoxId, BgPos> = {
  jing: { cx:  9, by: 38, h: 22 },
  dian: { cx: 24, by: 37, h: 21 },
  mo:   { cx: 39, by: 39, h: 12 },
  wen:  { cx: 47, by: 36, h:  9 },
  wen2: { cx: 52, by: 36, h:  9 },
  shui: { cx: 70, by: 38, h: 16 },
  shan: { cx: 86, by: 49, h: 22 },
  shi:  { cx: 13, by: 14, h: 16 },
  xin:  { cx: 83, by: 18, h: 24 },
};

export function LorePortal({ onClose, hutImages, bgImage, initialFoxId = null }: LorePortalProps) {
  const [phase, setPhase] = useState<Phase>('arriving');
  const [hoveredFox, setHoveredFoxState] = useState<FoxId | null>(null);
  const hutScale = useTweak('lore.hut.scale', 1.0);
  const hutSpread = useTweak('lore.hut.spread', 1.0);
  const loreBgDarken = useTweak('lore.bg.darken', 0);
  // When ?tweak=1 is on, draw dashed outlines + labels on each hotspot so
  // you can see where they sit relative to the painted buildings and tune
  // the percentages in BG_POSITIONS.
  const [debugHuts, setDebugHuts] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDebugHuts(params.get('tweak') === '1');
  }, []);
  // R3 (史中 P1 2026-05-12): when LorePortal opens with an `initialFoxId`
  // (e.g. PublishPin 金尾 Easter egg → 'xin'), pre-pin that fox so the entry
  // card renders immediately.
  const [pinnedFox, setPinnedFox] = useState<FoxId | null>(initialFoxId ?? null);
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
          layers continue to paint on top of it.

          Phase #16.7: bg + the village hut overlays live INSIDE one aspect-
          locked box so the hut % coords stay aligned with the painted
          buildings as the viewport resizes. The box is sized to fully cover
          the portal (`max(100%, ...)`) and centered, mimicking object-fit:cover
          but exposing the natural aspect to the children so the hut
          percentages map onto the bg image's intrinsic coordinate space. */}

      {/* Layer 1: stars (top 60% of sky) — kept regardless of bg, adds motion. */}
      <Stars count={40} />

      {/* Layer 2-4: procedural aurora / ridge / snow-ground — SUPPRESSED when
          a painted bg is shipped (the bg already has its own painted aurora,
          rocks, and snow ground). Without bg, these are the scene. */}
      {!bgImage && (
        <>
          <Aurora hue={195} top="18%" width={140} height={180} dur="22s" delay="0s"   opacity={0.55} filterId="aurora-cyan"   />
          <Aurora hue={270} top="24%" width={120} height={160} dur="28s" delay="-3s"  opacity={0.42} filterId="aurora-violet" />
          <Aurora hue={155} top="14%" width={160} height={200} dur="18s" delay="-7s"  opacity={0.38} filterId="aurora-jade"   />
          <Ridge />
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
            <svg width="0" height="0" aria-hidden style={{ position: 'absolute' }}>
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
        </>
      )}

      {/* Layer 5: village.
          - With painted bg: each hut is absolute-positioned over the
            corresponding building drawn into the panorama (Phase #16.7).
            The bg image + hut container share a single aspect-locked box
            so `cover`-style cropping affects both equally — hut % coords
            stay glued to the painted buildings as the viewport resizes.
          - Without bg: legacy flex-row layout. */}
      {bgImage ? (
        <div
          aria-hidden={false}
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            zIndex: 0,
            pointerEvents: 'auto',
          }}
        >
          <div
            // aspect-locked box, sized to fully cover the parent. The CSS
            // `max(100%, calc(...))` math mirrors object-fit:cover: pick the
            // larger of "viewport-width-driven" and "viewport-height-driven"
            // so the box always exceeds the viewport in both directions,
            // then center it.
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 'max(100%, calc(100vh * 2360 / 1640))',
              height: 'max(100%, calc(100vw * 1640 / 2360))',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              data-testid="lore-portal-bg-image"
              src={bgImage}
              alt=""
              aria-hidden
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                pointerEvents: 'none',
              }}
            />
            {loreBgDarken > 0 && (
              <div
                aria-hidden
                data-testid="lore-portal-bg-darken"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `rgba(0,0,0,${loreBgDarken})`,
                  pointerEvents: 'none',
                }}
              />
            )}
            {/* Hut overlays — percentages are now relative to the aspect-
                locked box, NOT the viewport, so they track the bg as it
                scales/crops. */}
            <div
              data-testid="village-row"
              style={{
                position: 'absolute',
                inset: 0,
                opacity: visible ? 1 : 0,
                transition: 'opacity 600ms cubic-bezier(.16,1,.3,1)',
                pointerEvents: 'none',
              }}
            >
          {VILLAGE.map((entry) => {
            const pos = BG_POSITIONS[entry.foxId];
            if (!pos) return null;
            const fox = getFox(entry.foxId);
            const isActive = activeFox === entry.foxId;
            return (
              <button
                key={entry.foxId}
                type="button"
                ref={(el) => {
                  if (el) houseRefs.current.set(entry.foxId, el);
                  else houseRefs.current.delete(entry.foxId);
                }}
                onPointerEnter={() => setHoveredFox(entry.foxId)}
                onPointerLeave={() => setHoveredFox(null)}
                onFocus={() => setHoveredFox(entry.foxId)}
                onBlur={() => setHoveredFox(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePin(entry.foxId);
                }}
                aria-label={`${fox.name} · ${fox.species}`}
                style={{
                  position: 'absolute',
                  left: `${pos.cx}%`,
                  bottom: `${pos.by}%`,
                  width: `${Math.round(pos.h * 0.9)}%`,
                  height: `${pos.h}%`,
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  transform: `translateX(-50%) scale(${hutScale})`,
                  transformOrigin: 'bottom center',
                  transition: 'box-shadow 240ms ease, background 240ms ease',
                  borderRadius: 12,
                  // Default: invisible click hotspot. Bg art is the visual.
                  // Hover / pin: subtle ring glow on the building (we keep the
                  // painted PNG out of the way — it duplicates the bg art).
                  boxShadow: isActive
                    ? `0 0 0 2px ${fox.glow}, 0 0 24px 4px ${fox.glow}88`
                    : 'none',
                  outline: debugHuts ? `2px dashed ${fox.glow}` : 'none',
                  outlineOffset: debugHuts ? -2 : 0,
                  zIndex: isActive ? 12 : 10,
                }}
                data-fox-id={entry.foxId}
              >
                {debugHuts && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      top: -22,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: fox.glow,
                      color: '#1A1815',
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 2,
                      fontFamily: '"JetBrains Mono", monospace',
                      letterSpacing: 0.5,
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.foxId}
                  </span>
                )}
              </button>
            );
          })}
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '3%',
                  transform: 'translateX(-50%)',
                  pointerEvents: 'auto',
                }}
              >
                <Signpost onOpen={() => setTechOpen(true)} />
              </div>
            </div>
          </div>
        </div>
      ) : (
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
            gap: `calc(clamp(12px, 2vw, 28px) * ${hutSpread})`,
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
                  style={{
                    marginLeft: i === 0 ? 0 : `calc(${HOUSE_OFFSETS[i] ?? 0}px * ${hutSpread})`,
                    transform: `scale(${hutScale})`,
                    transformOrigin: 'bottom center',
                  }}
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
      )}

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
