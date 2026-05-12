'use client';
import type { CSSProperties, ReactNode } from 'react';
import type { FoxId, FoxMeta } from '@/lib/foxes/registry';
import { getFox } from '@/lib/foxes/registry';

export type SilhouetteKind =
  | 'cottage'
  | 'tower'
  | 'studio'
  | 'orchestrator'
  | 'pavilion'
  | 'pavilion-mirror'
  | 'antenna'
  | 'observatory'
  | 'gatehouse';

export type WindowShape = 'arch' | 'square' | 'round' | 'lattice';

export interface VillageEntry {
  foxId: FoxId;
  silhouette: SilhouetteKind;
  width: number;
  height: number;
  windowShape: WindowShape;
  lore: string;
}

interface HouseProps {
  entry: VillageEntry;
  hovered: boolean;
  pinned?: boolean;
  onHover: (id: FoxId | null) => void;
  onClick: () => void;
  /**
   * When set, render an SVG <image> in place of the procedural shape primitives.
   * Decorative overlays (smoke, window glow) stay on top. Falls back to the
   * procedural silhouette when null/undefined. Resolution happens server-side
   * via `pickAssetUrl` in LoreAssets; this component is purely presentational.
   */
  imageSrc?: string;
}

const ROOF = '#0A1428';
const ROOF_STROKE = '#1A2A4A';
const BODY = '#0E1F3D';
const TRIM = '#152950';

interface WinProps {
  shape: WindowShape;
  x: number; y: number; w: number; h: number;
  gradId: string;
}

function Win({ shape, x, y, w, h, gradId }: WinProps) {
  const fill = `url(#${gradId})`;
  if (shape === 'arch') {
    const r = w / 2;
    const d = `M ${x} ${y + h} L ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} L ${x + w} ${y + h} Z`;
    return <path d={d} fill={fill} />;
  }
  if (shape === 'round') {
    const r = Math.min(w, h) / 2;
    return <circle cx={x + w / 2} cy={y + h / 2} r={r} fill={fill} />;
  }
  if (shape === 'lattice') {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={fill} />
        <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={ROOF} strokeWidth={0.8} />
        <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke={ROOF} strokeWidth={0.8} />
      </g>
    );
  }
  return <rect x={x} y={y} width={w} height={h} fill={fill} />;
}

interface ChimneyHint {
  x: number;   // % of house width (0–1)
  y: number;   // px above the SVG top edge (positive = above)
}

interface RenderedSilhouette {
  paths: ReactNode;
  windowRect: { x: number; y: number; w: number; h: number; shape: WindowShape };
  chimney: ChimneyHint | null;
}

// ──────────────────────────────────────────────────────────────────────────
// Per-fox silhouettes. Each is hand-built; same paper-cut language, different
// shapes. Width/height inputs come from village.json.
// ──────────────────────────────────────────────────────────────────────────

function silShui(w: number, h: number): RenderedSilhouette {
  // Low cottage with a low pitched roof. Tall arched window centered.
  return {
    paths: (
      <g>
        <polygon points={`6,38 ${w / 2},6 ${w - 6},38`} fill={ROOF} stroke={ROOF_STROKE} strokeWidth={0.5} />
        <rect x={10} y={38} width={w - 20} height={h - 38} fill={BODY} stroke={ROOF_STROKE} strokeWidth={0.5} />
        <rect x={w - 30} y={h - 28} width={14} height={26} fill={ROOF} />
      </g>
    ),
    windowRect: { x: w / 2 - 14, y: 50, w: 28, h: 32, shape: 'arch' },
    chimney: null,
  };
}

function silDian(w: number, h: number): RenderedSilhouette {
  // Tall narrow tower, lattice window, books at base, small pointed roof.
  return {
    paths: (
      <g>
        <polygon points={`6,40 ${w / 2},4 ${w - 6},40`} fill={ROOF} stroke={ROOF_STROKE} strokeWidth={0.5} />
        <rect x={14} y={40} width={w - 28} height={h - 50} fill={BODY} stroke={ROOF_STROKE} strokeWidth={0.5} />
        {/* Balcony band */}
        <rect x={10} y={70} width={w - 20} height={3} fill={TRIM} />
        {/* Tiny door */}
        <rect x={w / 2 - 8} y={h - 28} width={16} height={18} fill={ROOF} />
        {/* Stack of books at base */}
        <rect x={6}  y={h - 10} width={w - 18} height={3} fill={TRIM} opacity={0.85} />
        <rect x={3}  y={h - 7}  width={w - 12} height={3} fill={ROOF_STROKE} opacity={0.95} />
        <rect x={8}  y={h - 4}  width={w - 22} height={4} fill={BODY} />
      </g>
    ),
    windowRect: { x: w / 2 - 16, y: 86, w: 32, h: 28, shape: 'lattice' },
    chimney: null,
  };
}

function silMo(w: number, h: number): RenderedSilhouette {
  // Sloped studio roof, single chimney puff, round paper window.
  return {
    paths: (
      <g>
        {/* Asymmetric sloped roof */}
        <polygon points={`4,46 ${w / 2 - 4},10 ${w - 18},34 ${w - 4},44`} fill={ROOF} stroke={ROOF_STROKE} strokeWidth={0.5} />
        <rect x={10} y={44} width={w - 20} height={h - 48} fill={BODY} stroke={ROOF_STROKE} strokeWidth={0.5} />
        {/* Small chimney on the right slope */}
        <rect x={w - 28} y={14} width={6} height={20} fill={ROOF} />
        {/* Door */}
        <rect x={w - 26} y={h - 26} width={14} height={24} fill={ROOF} />
      </g>
    ),
    windowRect: { x: 24, y: 60, w: 28, h: 28, shape: 'round' },
    chimney: { x: 0.78, y: 8 },
  };
}

function silShan(w: number, h: number): RenderedSilhouette {
  // Two-story orchestrator with twin chimneys + banner pole + arch window.
  return {
    paths: (
      <g>
        {/* Lower body */}
        <rect x={12} y={68} width={w - 24} height={h - 70} fill={BODY} stroke={ROOF_STROKE} strokeWidth={0.5} />
        {/* Upper story */}
        <rect x={28} y={38} width={w - 56} height={30} fill={BODY} stroke={ROOF_STROKE} strokeWidth={0.5} />
        {/* Upper roof */}
        <polygon points={`24,38 ${w / 2},10 ${w - 24},38`} fill={ROOF} stroke={ROOF_STROKE} strokeWidth={0.5} />
        {/* Twin chimneys */}
        <rect x={36} y={20} width={6} height={20} fill={ROOF} />
        <rect x={w - 42} y={20} width={6} height={20} fill={ROOF} />
        {/* Banner pole (front) — flag pulses with the lantern, drawn flat */}
        <line x1={w / 2} y1={38} x2={w / 2} y2={22} stroke="#A89B7E" strokeWidth={0.8} />
        <polygon points={`${w / 2},22 ${w / 2 + 8},25 ${w / 2},28`} fill="#A89B7E" opacity={0.7} />
        {/* Door */}
        <rect x={w / 2 - 8} y={h - 28} width={16} height={26} fill={ROOF} />
        {/* Step */}
        <rect x={w / 2 - 14} y={h - 4} width={28} height={4} fill={TRIM} />
      </g>
    ),
    windowRect: { x: w / 2 - 14, y: 78, w: 28, h: 30, shape: 'arch' },
    chimney: { x: 0.32, y: 6 },
  };
}

function silWen(w: number, h: number, mirror = false): RenderedSilhouette {
  // Curved-eave pavilion (operatic stage-house). Lattice window.
  // Mirror flag flips horizontally for wen2.
  const eaveD = `M 4 44 Q 14 44 14 38 L ${w / 2 - 4} 12 L ${w / 2 + 4} 12 L ${w - 14} 38 Q ${w - 14} 44 ${w - 4} 44 Z`;
  const transform = mirror ? `translate(${w}, 0) scale(-1, 1)` : undefined;
  return {
    paths: (
      <g transform={transform}>
        {/* Curved-eave roof */}
        <path d={eaveD} fill={ROOF} stroke={ROOF_STROKE} strokeWidth={0.5} />
        {/* Top ridge tile bump */}
        <rect x={w / 2 - 3} y={8} width={6} height={4} fill={ROOF} />
        {/* Body */}
        <rect x={14} y={44} width={w - 28} height={h - 48} fill={BODY} stroke={ROOF_STROKE} strokeWidth={0.5} />
        {/* Stage column accents (left only — mirrored when wen2) */}
        <rect x={20} y={48} width={3} height={h - 54} fill={TRIM} />
        <rect x={w - 23} y={48} width={3} height={h - 54} fill={TRIM} />
        {/* Door */}
        <rect x={w - 36} y={h - 28} width={14} height={26} fill={ROOF} />
      </g>
    ),
    windowRect: { x: 32, y: 56, w: 38, h: 32, shape: 'lattice' },
    chimney: null,
  };
}

function silShi(w: number, h: number): RenderedSilhouette {
  // Modern blocky house with TV antenna + small dish — only modern silhouette.
  return {
    paths: (
      <g>
        {/* Antenna mast */}
        <line x1={26} y1={48} x2={26} y2={8} stroke={ROOF} strokeWidth={1.2} />
        <line x1={18} y1={16} x2={34} y2={16} stroke={ROOF} strokeWidth={0.8} />
        <line x1={20} y1={24} x2={32} y2={24} stroke={ROOF} strokeWidth={0.8} />
        <line x1={22} y1={32} x2={30} y2={32} stroke={ROOF} strokeWidth={0.8} />
        {/* Dish */}
        <ellipse cx={w - 30} cy={32} rx={9} ry={4} fill={ROOF} />
        <line x1={w - 30} y1={32} x2={w - 30} y2={48} stroke={ROOF} strokeWidth={0.8} />
        {/* Flat roof */}
        <rect x={10} y={48} width={w - 20} height={6} fill={ROOF} />
        {/* Body */}
        <rect x={14} y={54} width={w - 28} height={h - 58} fill={BODY} stroke={ROOF_STROKE} strokeWidth={0.5} />
        {/* Door */}
        <rect x={w - 30} y={h - 28} width={14} height={24} fill={ROOF} />
      </g>
    ),
    windowRect: { x: 24, y: 68, w: 28, h: 24, shape: 'square' },
    chimney: null,
  };
}

function silJing(w: number, h: number): RenderedSilhouette {
  // Stepped observatory with porthole + dome + chart-cap.
  return {
    paths: (
      <g>
        {/* Body — the lower observatory hall */}
        <rect x={10} y={66} width={w - 20} height={h - 70} fill={BODY} stroke={ROOF_STROKE} strokeWidth={0.5} />
        {/* Pyramid roof to dome neck */}
        <polygon points={`6,66 ${w / 2},32 ${w - 6},66`} fill={ROOF} stroke={ROOF_STROKE} strokeWidth={0.5} />
        {/* Cylinder neck */}
        <rect x={w / 2 - 10} y={20} width={20} height={14} fill={ROOF} />
        {/* Dome cap */}
        <path d={`M ${w / 2 - 10} 20 A 10 10 0 0 1 ${w / 2 + 10} 20 Z`} fill={ROOF} />
        {/* Tiny telescope pip on the dome */}
        <line x1={w / 2 + 4} y1={14} x2={w / 2 + 12} y2={6} stroke="#A89B7E" strokeWidth={1} />
        {/* Door */}
        <rect x={w - 30} y={h - 28} width={14} height={24} fill={ROOF} />
      </g>
    ),
    windowRect: { x: 22, y: 80, w: 28, h: 28, shape: 'round' },
    chimney: null,
  };
}

function silXin(w: number, h: number): RenderedSilhouette {
  // Strict-symmetric gatehouse with two pillars + cross-bar window.
  return {
    paths: (
      <g>
        {/* Hipped roof */}
        <polygon points={`6,40 22,14 ${w - 22},14 ${w - 6},40`} fill={ROOF} stroke={ROOF_STROKE} strokeWidth={0.5} />
        {/* Body */}
        <rect x={10} y={40} width={w - 20} height={h - 46} fill={BODY} stroke={ROOF_STROKE} strokeWidth={0.5} />
        {/* Two flanking pillars */}
        <rect x={20} y={40} width={8} height={h - 46} fill={TRIM} />
        <rect x={w - 28} y={40} width={8} height={h - 46} fill={TRIM} />
        {/* Door */}
        <rect x={w / 2 - 8} y={h - 32} width={16} height={26} fill={ROOF} />
        {/* Two base steps */}
        <rect x={16} y={h - 6} width={w - 32} height={3} fill={TRIM} />
      </g>
    ),
    windowRect: { x: w / 2 - 12, y: 50, w: 24, h: 22, shape: 'square' },
    chimney: null,
  };
}

// Cross-mullion overlay drawn separately so we can keep `Win` shape-agnostic.
function XinMullion({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={ROOF} strokeWidth={0.9} />
      <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke={ROOF} strokeWidth={0.9} />
    </g>
  );
}

function renderSilhouette(kind: SilhouetteKind, w: number, h: number): RenderedSilhouette {
  switch (kind) {
    case 'cottage':         return silShui(w, h);
    case 'tower':           return silDian(w, h);
    case 'studio':          return silMo(w, h);
    case 'orchestrator':    return silShan(w, h);
    case 'pavilion':        return silWen(w, h, false);
    case 'pavilion-mirror': return silWen(w, h, true);
    case 'antenna':         return silShi(w, h);
    case 'observatory':     return silJing(w, h);
    case 'gatehouse':       return silXin(w, h);
  }
}

export function House({ entry, hovered, pinned = false, onHover, onClick, imageSrc }: HouseProps) {
  const fox: FoxMeta = getFox(entry.foxId);
  const { paths, windowRect, chimney } = renderSilhouette(entry.silhouette, entry.width, entry.height);
  const gradId = `house-${entry.foxId}-glow`;
  const usePainted = Boolean(imageSrc);

  const wrap: CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    transform: hovered ? 'translateY(-6px) scale(1.04)' : 'translateY(0) scale(1)',
    transition: 'transform 280ms cubic-bezier(.16,.84,.24,1)',
    flexShrink: 0,
    background: 'transparent',
    border: 'none',
    padding: 0,
    margin: 0,
    fontFamily: 'inherit',
    color: 'inherit',
  };

  const svgStyle: CSSProperties = {
    filter: `drop-shadow(0 0 ${hovered ? 14 : 8}px ${fox.glowSoft})`,
    transition: 'filter 280ms cubic-bezier(.16,.84,.24,1)',
  };

  const labelStyle: CSSProperties = {
    marginTop: 8,
    fontSize: 11,
    color: '#E6EFFF',
    fontFamily: '"Noto Serif SC", serif',
    letterSpacing: 2,
    opacity: hovered ? 1 : 0.5,
    textShadow: hovered ? `0 0 8px ${fox.glow}aa` : 'none',
    transition: 'opacity 220ms cubic-bezier(.4,0,.2,1), text-shadow 220ms',
    whiteSpace: 'nowrap',
  };

  return (
    <button
      type="button"
      data-testid="house"
      data-fox-id={entry.foxId}
      data-hovered={hovered}
      data-pinned={pinned}
      aria-label={`${fox.name} · ${fox.epithet} · ${fox.verbSubtitle}`}
      aria-pressed={pinned}
      onMouseEnter={() => onHover(entry.foxId)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(entry.foxId)}
      onBlur={() => onHover(null)}
      onClick={onClick}
      style={wrap}
    >
      {chimney && (
        <div
          data-testid="house-smoke"
          style={{
            position: 'absolute',
            left: `${chimney.x * 100}%`,
            top: -28 + chimney.y,
            width: 5,
            height: 28,
            background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.22))',
            borderRadius: 5,
            animation: 'smokeRise 4.6s ease-in-out infinite',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }}
        />
      )}
      <svg
        width={entry.width}
        height={entry.height}
        viewBox={`0 0 ${entry.width} ${entry.height}`}
        style={svgStyle}
      >
        <defs>
          <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={fox.glow} stopOpacity={hovered ? 1 : 0.92} />
            <stop offset="60%" stopColor={fox.glowSoft} stopOpacity={0.85} />
            <stop offset="100%" stopColor={fox.glowSoft} stopOpacity={0} />
          </radialGradient>
        </defs>
        {usePainted ? (
          <image
            data-testid={`hut-image-${entry.foxId}`}
            href={imageSrc}
            x={0}
            y={0}
            width={entry.width}
            height={entry.height}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <g data-testid={`hut-svg-${entry.foxId}`}>{paths}</g>
        )}
        <Win
          shape={windowRect.shape}
          x={windowRect.x}
          y={windowRect.y}
          w={windowRect.w}
          h={windowRect.h}
          gradId={gradId}
        />
        {entry.foxId === 'xin' && (
          <XinMullion x={windowRect.x} y={windowRect.y} w={windowRect.w} h={windowRect.h} />
        )}
      </svg>
      <div style={labelStyle}>{fox.name}</div>
    </button>
  );
}
