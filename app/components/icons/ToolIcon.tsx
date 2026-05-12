// Phase #16 Track 7 — ToolIcon: a single component for all functional UI
// icons. Looks up a hand-drawn override at /art/icons/{name}.svg via the
// asset resolver; falls back to an inline Lucide-style SVG when no asset is
// present. Renders as a Server Component since pickAssetUrl uses node:fs.
// Do NOT add 'use client' here.

import type { ReactElement } from 'react';
import { pickAssetUrl } from '@/lib/art/asset-resolver';

export type ToolIconName =
  | 'vault'
  | 'trends'
  | 'stats'
  | 'settings'
  | 'ai-touched'
  | 'flag'
  | 'fox';

export interface ToolIconProps {
  name: ToolIconName;
  size?: number;
  className?: string;
  color?: string;
}

// Resolved once at module load (server-side). pickAssetUrl is cached per-path
// so this is also safe to call inline if a developer imports the function
// directly. Using a static map keeps the per-render cost flat. Prefers PNG
// (Gemini-generated, Phase #16.5) and falls back to SVG.
function resolveIcon(name: ToolIconName): string | null {
  return pickAssetUrl(`/art/icons/${name}.png`) ?? pickAssetUrl(`/art/icons/${name}.svg`);
}

const ICON_URLS: Record<ToolIconName, string | null> = {
  vault:        resolveIcon('vault'),
  trends:       resolveIcon('trends'),
  stats:        resolveIcon('stats'),
  settings:     resolveIcon('settings'),
  'ai-touched': resolveIcon('ai-touched'),
  flag:         resolveIcon('flag'),
  fox:          resolveIcon('fox'),
};

interface FallbackProps {
  size: number;
  color: string;
}

function VaultFallback({ size, color }: FallbackProps): ReactElement {
  // BookOpen-style: open book outline with center seam.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5a2 2 0 0 1 2-2h6v17H4a2 2 0 0 1-2-2z" />
      <path d="M22 5a2 2 0 0 0-2-2h-6v17h6a2 2 0 0 0 2-2z" />
      <path d="M12 4v17" />
    </svg>
  );
}

function TrendsFallback({ size, color }: FallbackProps): ReactElement {
  // Flame-style: stylized flame outline.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c1 3 4 5 4 9a4 4 0 1 1-8 0c0-1 .5-2 1.5-3-.5 2 .5 3 1.5 3 0-3 1-6 1-9z" />
      <path d="M9 13c-.6 1-1 2-1 3a4 4 0 0 0 8 0c0-1-.4-2-1-3" />
    </svg>
  );
}

function StatsFallback({ size, color }: FallbackProps): ReactElement {
  // BarChart3-style: three ascending bars + baseline.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V5" />
      <path d="M3 21h18" />
      <path d="M7 21V13" />
      <path d="M12 21V8" />
      <path d="M17 21V3" />
    </svg>
  );
}

function SettingsFallback({ size, color }: FallbackProps): ReactElement {
  // Settings cog: 8-tooth gear (simplified).
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M4.9 19.1l2.1-2.1 M17 7l2.1-2.1" />
    </svg>
  );
}

function AiTouchedFallback({ size, color }: FallbackProps): ReactElement {
  // Sparkles: large 4-pointed star + small accent star.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3l1.6 4.4L15 9l-4.4 1.6L9 15l-1.6-4.4L3 9l4.4-1.6z" />
      <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z" />
    </svg>
  );
}

function FlagFallback({ size, color }: FallbackProps): ReactElement {
  // Small flag on a pole.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21V4" />
      <path d="M5 4h11l-2.5 4L16 12H5" />
    </svg>
  );
}

function FoxFallback({ size, color }: FallbackProps): ReactElement {
  // Simplified fox-head silhouette: triangle with two ear notches + snout.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5l4 4 4-1 4 1 4-4-1 7a7 7 0 0 1-14 0z" />
      <path d="M10 14l2 2 2-2" />
    </svg>
  );
}

const FALLBACKS: Record<ToolIconName, (p: FallbackProps) => ReactElement> = {
  vault: VaultFallback,
  trends: TrendsFallback,
  stats: StatsFallback,
  settings: SettingsFallback,
  'ai-touched': AiTouchedFallback,
  flag: FlagFallback,
  fox: FoxFallback,
};

export function ToolIcon({
  name,
  size = 18,
  className,
  color = 'currentColor',
}: ToolIconProps): ReactElement {
  const url = ICON_URLS[name];
  const testId = `tool-icon-${name}`;

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className={className}
        data-testid={testId}
        data-source="asset"
        style={{ display: 'inline-block' }}
      />
    );
  }

  const Fallback = FALLBACKS[name];
  return (
    <span
      className={className}
      data-testid={testId}
      data-source="fallback"
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color }}
    >
      <Fallback size={size} color={color} />
    </span>
  );
}

export default ToolIcon;
