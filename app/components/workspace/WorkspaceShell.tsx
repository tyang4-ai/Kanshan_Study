'use client';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { LeftRail } from '@/components/rail/LeftRail';
import { LoreEnvelope } from '@/components/rail/LoreEnvelope';
import { WritingSurface } from '@/components/editor/WritingSurface';
import { ContextMenu } from '@/components/menu/ContextMenu';
import { TabbedFloatingWindow } from '@/components/floating/TabbedFloatingWindow';
import { LorePortal } from '@/components/lore/LorePortal';
import type { FoxId } from '@/lib/foxes/registry';
import { AiFailureToast } from '@/components/chrome/AiFailureToast';
import { AuthErrorToast } from '@/components/chrome/AuthErrorToast';
import { DailyFoxPulse } from '@/components/onboarding/DailyFoxPulse';
import { ReturningVisitorBubble } from '@/components/onboarding/ReturningVisitorBubble';
import { useGlobalShortcuts } from './useGlobalShortcuts';
import {
  TrendsConfirmModal,
  markTrendsAcknowledged,
} from '@/components/floating/TrendsConfirmModal';
import { useTrendsGateStore } from '@/lib/store/trends-gate';
import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { useTweak } from '@/lib/store/tweak';
import { TweakPanel } from '@/components/dev/TweakPanel';
import { useLastVisitStore, hydrateFromServer, schedulePushToServer } from '@/lib/store/last-visit';

const ZERO_RECT: DOMRect = {
  x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0,
  toJSON: () => ({}),
} as DOMRect;

interface WorkspaceShellProps {
  /** Pre-resolved painted-hut image map (server-side via `getLoreAssets`). Optional; missing entries fall back to procedural SVG. */
  loreHutImages?: Partial<Record<FoxId, string>>;
  /** Pre-resolved lore-portal background image URL (server-side via `getLoreAssets`). */
  loreBgImage?: string | null;
  /** Pre-resolved workspace background image URL (server-side via `getWorkspaceBgUrl`). */
  workspaceBgUrl?: string | null;
  /** Pre-resolved account avatar URLs (server-side via `getAccountAvatarUrls`). */
  avatarUrls?: { readonly me: string | null; readonly guwanxi: string | null };
}

// Shared workspace shell. `/` (clickthrough) and `/live` (finals) both mount
// this; the wrapping providers / overlays differ per route.
export function WorkspaceShell({ loreHutImages, loreBgImage, workspaceBgUrl = null, avatarUrls }: WorkspaceShellProps = {}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [selection, setSelection] = useState<{ text: string; rect: DOMRect } | null>(null);
  const [loreOpen, setLoreOpen] = useState(false);
  // R3 (史中 P1 2026-05-12): when an event detail carries `foxId`, pre-pin
  // that fox in the portal (used by PublishPin 金尾 Easter egg → 'xin').
  const [loreInitialFox, setLoreInitialFox] = useState<FoxId | null>(null);
  const workspaceBgDarken = useTweak('workspace.bg.darken', 0.65);

  // R8 demo coherence (Lin Maohua + Shi Junhe) P0: NextBeatHint's "open-lore"
  // action dispatches a `kanshan:open-lore` window event; listen and open the
  // portal so the 2:50 demo beat actually pops the aurora scene on-screen
  // instead of requiring the founder to click LoreEnvelope manually.
  useEffect(() => {
    const onOpenLore = (event: Event): void => {
      const detail = (event as CustomEvent<{ foxId?: FoxId }>).detail;
      setLoreInitialFox(detail?.foxId ?? null);
      setLoreOpen(true);
    };
    window.addEventListener('kanshan:open-lore', onOpenLore);
    return () => window.removeEventListener('kanshan:open-lore', onOpenLore);
  }, []);

  // R3 (李笛 / 徐诗 P1 2026-05-12): cross-device visit-state sync. On mount,
  // pull server snapshot if newer. Subscribe to store updates and push back
  // every 30s (debounced). 401/503 are silent fallbacks to localStorage-only.
  useEffect(() => {
    void hydrateFromServer();
    const unsub = useLastVisitStore.subscribe(() => schedulePushToServer(30_000));
    return () => unsub();
  }, []);

  // The TipTap editor occasionally emits a null selection while a right-click
  // is in flight (e.g. browsers that move focus before contextmenu fires).
  // `handleSelectionChange` prefers truthy updates; null updates are accepted
  // but we keep the previous truthy snapshot in `lastSelection` so AI dispatch
  // surfaces (ContextMenu, shortcuts, RightToolbar) still have a target.
  const [lastSelection, setLastSelection] = useState<{ text: string; rect: DOMRect } | null>(null);
  const handleSelectionChange = (next: { text: string; rect: DOMRect } | null) => {
    setSelection(next);
    if (next) {
      lastSelectionRef.current = next;
      setLastSelection(next);
    }
  };

  // Mirror lastSelection to a ref so the once-bound keydown listener inside
  // useGlobalShortcuts always reads the freshest snapshot.
  const lastSelectionRef = useRef<{ text: string; rect: DOMRect } | null>(null);

  // Effective selection passed to ContextMenu / shortcuts: prefer live state,
  // fall back to the pre-right-click snapshot.
  const effectiveSelection = selection ?? lastSelection;

  // A1 · global Ctrl+Shift+M / R / F shortcuts (capture-phase, IME-aware).
  useGlobalShortcuts(lastSelectionRef);

  // Workspace-level trends gate: bulletin card (and any future surface) push a
  // pending trend into this store; we render TrendsConfirmModal here so the
  // gate flow works from anywhere, not just inside the floating TrendsTab.
  const pendingTrend = useTrendsGateStore((s) => s.pending);
  const clearPendingTrend = useTrendsGateStore((s) => s.clear);

  const handleTrendsGateConfirm = () => {
    markTrendsAcknowledged();
    if (pendingTrend) {
      useFloatingWindowStore.getState().openTab('research', '看水 · 考据卷', {
        selection: { text: pendingTrend.title, rect: ZERO_RECT },
      });
    }
    clearPendingTrend();
  };

  // Snapshot current selection on right-click mousedown, before browser may
  // collapse it on contextmenu.
  const onEditorMouseDownCapture = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 2 && selection) {
      lastSelectionRef.current = selection;
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col" style={{ background: '#2A2724', position: 'relative' }}>
      {workspaceBgUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={workspaceBgUrl}
            alt=""
            aria-hidden
            data-testid="workspace-bg-image"
            style={{
              position: 'fixed', inset: 0, width: '100vw', height: '100vh',
              objectFit: 'cover', zIndex: 0,
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'fixed', inset: 0, zIndex: 1,
              background: `rgba(26, 31, 42, ${workspaceBgDarken})`,
            }}
          />
        </>
      )}
      {/* R2 a11y P0 (Yang Zhihua): skip-link so keyboard users don't have to
          tab through 15+ topbar buttons before reaching the editor. Visually
          hidden until focused. */}
      <a
        href="#main-workspace"
        data-testid="skip-link"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[3000] focus:bg-white focus:px-3 focus:py-1 focus:text-xs focus:underline focus:outline"
        style={{
          left: 8,
          top: 8,
          color: '#1772F6',
          fontFamily: '"Noto Serif SC", serif',
        }}
      >
        跳到编辑区
      </a>
      {/* A11y persona-review R2: wrap the primary work area in a <main>
          landmark so screen-reader users can jump straight to it. The
          editor + side rails are the principal content. */}
      <main
        id="main-workspace"
        className="flex min-h-0 flex-1"
        style={{ background: '#FAF8F3', position: 'relative', zIndex: 2 }}
        onMouseDownCapture={onEditorMouseDownCapture}
        aria-label="看山书房工作台"
      >
        <LeftRail />
        <WritingSurface
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu({ x: e.clientX, y: e.clientY });
          }}
          onSelectionChange={handleSelectionChange}
          floatingToolbarSelection={effectiveSelection}
          avatarUrls={avatarUrls}
        />
      </main>

      <LoreEnvelope onClick={() => setLoreOpen(true)} />

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          hasSelection={!!effectiveSelection}
          selection={effectiveSelection}
          onClose={() => setMenu(null)}
        />
      )}

      {loreOpen && (
        <LorePortal
          onClose={() => {
            setLoreOpen(false);
            setLoreInitialFox(null);
          }}
          hutImages={loreHutImages}
          bgImage={loreBgImage}
          initialFoxId={loreInitialFox}
        />
      )}

      <TabbedFloatingWindow />

      <AiFailureToast />

      <AuthErrorToast />

      <DailyFoxPulse />

      <ReturningVisitorBubble />

      <TweakPanel />

      <TrendsConfirmModal
        open={pendingTrend !== null}
        onConfirm={handleTrendsGateConfirm}
        onCancel={clearPendingTrend}
      />
    </div>
  );
}
