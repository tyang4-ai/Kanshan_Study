'use client';
// Phase #13.99 — talk-to / tool reframe (revision tag for HMR invalidation)
import { useEffect, useRef, useState } from 'react';
import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { useZhihuBudgetStore } from '@/lib/zhihu/budget';
import { useZhihuSessionStore } from '@/lib/store/zhihu-session';
import { useAiErrorStore } from '@/lib/store/ai-error';

// Mirror of `AccountAvatarUrls` from `@/lib/art/account-avatars`. We don't
// import the type here because that module is `server-only`; pulling even a
// type-only import would risk bundling node:fs into the client chunk under
// some TS configs. Keep this shape in sync with that module.
//
// Demo-day collapse (2026-05-13): only 顾婉昔 ships now. `me` kept as a
// nullable field so older art-fetch code paths don't fail at type-check
// time; nothing renders it.
export interface AccountAvatarUrls {
  readonly me: string | null;
  readonly guwanxi: string | null;
}

// R3 fix (user 2026-05-12): top-bar redundancy reduction. Top bar = 4 daily
// foxes (shi/dian/mo/shui) + settings; right toolbar = 5 advanced fox features
// (wen persona+debate / wen2 custom-mask / jing stats / xin compliance / 看山
// chat-bubble). `voice-diff` and `research` join the top-bar opener set; the
// advanced trio (persona / debate / stats) get demoted off the top bar but stay
// in the right toolbar as selection-driven actions.
export type ToolbarKind =
  | 'vault' | 'stats' | 'trends' | 'settings' | 'persona' | 'debate'
  | 'voice-diff' | 'research';

// Helper: opens each panel with the locked title.
export function useToolbarOpeners() {
  const openTab = useFloatingWindowStore((s) => s.openTab);
  return {
    onOpenVault:     () => openTab('vault', '看典 · 档案库'),
    onOpenTrends:    () => openTab('trends', '看势 · 热榜雷达'),
    onOpenStats:     () => openTab('stats', '看镜 · 数据看板'),
    onOpenSettings:  () => openTab('settings', '看山书房 · 设置'),
    onOpenPersona:   () => openTab('persona', '看文 · 读者反应'),
    onOpenDebate:    () => openTab('debate', '看文 · 看纹辩论'),
    onOpenVoiceDiff: () => openTab('voice-diff', '看墨 · 润色'),
    onOpenResearch:  () => openTab('research', '看水 · 考据卷'),
  };
}

interface TitleBarProps {
  avatarUrls?: AccountAvatarUrls;
}

const EMPTY_AVATAR_URLS: AccountAvatarUrls = { me: null, guwanxi: null };

export function TitleBar({ avatarUrls = EMPTY_AVATAR_URLS }: TitleBarProps = {}) {
  const openTab = useFloatingWindowStore((s) => s.openTab);

  // Hydrate the zhihu OAuth session once on mount; the badge below decides
  // whether to render based on the result.
  useEffect(() => {
    void useZhihuSessionStore.getState().hydrate();
  }, []);

  const onOpenVault     = () => openTab('vault', '看典 · 档案库');
  const onOpenTrends    = () => openTab('trends', '看势 · 热榜雷达');
  const onOpenStats     = () => openTab('stats', '看镜 · 数据看板');
  const onOpenSettings  = () => openTab('settings', '看山书房 · 设置');
  const onOpenPersona   = () => openTab('persona', '看文 · 读者反应');
  const onOpenDebate    = () => openTab('debate', '看文 · 看纹辩论');
  // r4 张荣乐 + 吴伟 + 周源 P0 (2026-05-12): daily 4 = mo/shi/dian/shui — in
  // topbar terms voice-diff/trends/vault/research. The other two (voice-diff,
  // research) were defined in useToolbarOpeners but never rendered.
  const onOpenVoiceDiff = () => openTab('voice-diff', '看墨 · 润色');
  const onOpenResearch  = () => openTab('research', '看水 · 考据卷');

  return (
    <div style={{
      height: 28,
      background: 'linear-gradient(180deg, #3A3633 0%, #2E2B28 100%)',
      display: 'flex', alignItems: 'center', padding: '0 12px',
      borderBottom: '1px solid #1A1815',
      flexShrink: 0,
      fontFamily: '"Noto Sans SC", sans-serif',
    }}>
      {/* Mac-style traffic-light buttons removed per user direction (Windows themed). */}
      {/* Demo-flow judge persona-review 2026-05-11 P0: the locked tagline must be
          on screen (the demo script's opening hook calls it out by name). */}
      <div style={{ flex: 1, textAlign: 'left', display: 'flex', alignItems: 'baseline', gap: 14,
        fontFamily: '"Noto Serif SC", serif', minWidth: 0 }}>
        <span data-testid="titlebar-name" style={{ fontSize: 12, color: '#A89B7E', letterSpacing: 2, flexShrink: 0 }}>
          看山书房
        </span>
        <span data-testid="titlebar-tagline" style={{ fontSize: 11, color: 'rgba(168,155,126,0.72)', letterSpacing: 1.5,
          fontFamily: '"Noto Serif SC", serif',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          灵感激发 · 思路梳理 · 内容精加工
        </span>
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', color: '#A89B7E', fontSize: 12 }}>
        {/* Talk-to cluster — the 4 agents the user converses with. 看山 chat is bottom-right floating bubble (Task E). */}
        <ToolbarIcon kind="persona" onClick={onOpenPersona} tourId="persona-button" title="看文 · 读者反应"/>
        <ToolbarIcon kind="debate" onClick={onOpenDebate} tourId="debate-button" title="看文 · 看纹辩论"/>
        <ToolbarIcon kind="stats" onClick={onOpenStats} tourId="stats-button" title="看镜 · 数据看板"/>
        <span style={{ width: 1, height: 16, background: 'rgba(168,155,126,0.25)' }} aria-hidden />
        {/* r5 TASK G (emmett P1): "常用" chip makes the daily-4 hierarchy
            explicit. Pairs with RightToolbar's opacity-dim default on advanced-5. */}
        <span
          aria-hidden
          style={{
            fontSize: 9,
            color: 'rgba(168,155,126,0.7)',
            letterSpacing: 1.5,
            fontFamily: '"Noto Serif SC", serif',
            border: '1px solid rgba(168,155,126,0.35)',
            borderRadius: 8,
            padding: '0 6px',
            lineHeight: '14px',
            marginRight: 2,
          }}
        >
          常用
        </span>
        {/* Tool cluster (daily 4 + settings) — surfaces dispatched by 看山,
            also user-launchable for direct access. Daily 4 = mo/shi/dian/shui
            (voice-diff / trends / vault / research). */}
        <ToolbarIcon kind="voice-diff" onClick={onOpenVoiceDiff} title="看墨 · 润色"/>
        <ToolbarIcon kind="trends" onClick={onOpenTrends} title="看势 · 热榜雷达"/>
        <ToolbarIcon kind="vault" onClick={onOpenVault} title="看典 · 档案库"/>
        <ToolbarIcon kind="research" onClick={onOpenResearch} title="看水 · 考据卷"/>
        <ToolbarIcon kind="settings" onClick={onOpenSettings} tourId="settings-button" title="看山书房 · 设置"/>
        {/* r5 TASK J gap-close (李大海 P1): visible topology summary so the
            "9 狐 · 端 2 / 云 7" answer is on chrome at all times, not just inside
            Settings. Click forwards to Settings 拓扑图 section. */}
        <button
          type="button"
          onClick={onOpenSettings}
          data-testid="topology-chip"
          title="9 只狐影 · 端侧 2 只（看心 · 看典） · 云端 7 只 · 路由可见 — 点击查看完整拓扑"
          style={{
            background: 'transparent',
            border: '1px solid rgba(31,91,71,0.55)',
            borderRadius: 10,
            color: '#8FCDB5',
            fontFamily: '"Noto Serif SC", serif',
            fontSize: 10,
            padding: '0 7px',
            lineHeight: '15px',
            cursor: 'pointer',
            letterSpacing: 0.4,
            marginLeft: 2,
          }}
        >
          9 狐 · 端 2 · 云 7
        </button>
        <ManualLink />
        <BudgetChip />
        <DemoPersonaBadge avatarUrls={avatarUrls} />
        <ZhihuBadge />
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export function ManualLink() {
  return (
    <a
      href="/manual"
      target="_blank"
      rel="noopener noreferrer"
      data-testid="manual-link"
      aria-label="使用手册 (新窗口打开)"
      title="使用手册"
      style={{
        color: 'rgba(168,155,126,0.85)',
        fontSize: 11,
        letterSpacing: 1.5,
        textDecoration: 'none',
        fontFamily: '"Noto Serif SC", serif',
        padding: '2px 6px',
        borderRadius: 2,
        border: '1px solid rgba(168,155,126,0.3)',
      }}
    >
      帮助
    </a>
  );
}

export function ZhihuBadge() {
  const fullname = useZhihuSessionStore((s) => s.fullname);
  const uid = useZhihuSessionStore((s) => s.uid);
  const avatarPath = useZhihuSessionStore((s) => s.avatarPath);
  const clear = useZhihuSessionStore((s) => s.clear);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Outside-click closes the popover.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!fullname) return null;

  const onLogout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/zhihu/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // Server unreachable — still clear client state.
    }
    clear();
    setOpen(false);
    useAiErrorStore.getState().push({ message: '已退出知乎账号' });
  };

  const accent = '#0084FF';
  const label = `已登录 · ${truncate(fullname, 6)}`;
  const initial = fullname.slice(0, 1);

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        data-testid="zhihu-badge"
        onClick={() => setOpen((v) => !v)}
        aria-label={`知乎账号 ${fullname}`}
        title={`知乎账号 · ${fullname}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '2px 8px', borderRadius: 4,
          border: `1px solid ${accent}`,
          background: 'transparent',
          color: accent,
          fontSize: 11, cursor: 'pointer',
          fontFamily: '"Noto Serif SC", serif',
        }}
      >
        <span style={{
          width: 18, height: 18, borderRadius: 9,
          background: avatarPath ? '#fff' : accent,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: '#fff', overflow: 'hidden',
        }}>
          {avatarPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarPath} alt="" width={18} height={18} style={{ display: 'block', objectFit: 'cover' }} />
          ) : initial}
        </span>
        <span>{label}</span>
      </button>
      {open && (
        <div
          data-testid="zhihu-badge-popover"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 6,
            minWidth: 220,
            padding: '10px 12px',
            background: '#FFFDF8',
            border: '1px solid rgba(168,155,126,0.45)',
            borderRadius: 4,
            boxShadow: '0 14px 30px rgba(0,0,0,0.32)',
            color: '#2A2419',
            fontFamily: '"Noto Serif SC", serif',
            zIndex: 5000,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 14,
              background: avatarPath ? '#fff' : accent,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: '#fff', overflow: 'hidden',
            }}>
              {avatarPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPath} alt="" width={28} height={28} style={{ display: 'block', objectFit: 'cover' }} />
              ) : initial}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{fullname}</span>
              {uid && (
                <span style={{
                  fontSize: 10, color: '#7A6F5A',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>{uid}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            data-testid="zhihu-logout"
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: 11,
              border: '1px solid rgba(184,85,67,0.45)',
              background: 'transparent',
              color: '#B85543',
              fontFamily: '"Noto Serif SC", serif',
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}

export function ToolbarIcon({ kind, onClick, tourId, title }: { kind: ToolbarKind; onClick: () => void; tourId?: string; title?: string }) {
  // r5 TASK J (李大海 P1): 端 badge marks foxes that run in the browser.
  // dian (vault) is local-vector retrieval; other daily-4/advanced-5 are云端.
  const isEdgeFox = kind === 'vault';
  // r4 user 2026-05-12: 4 ACTION slots have designed PNG icons in
  // public/icons/ (vault / stats / trends / settings). 4 fox-themed slots
  // (voice-diff = 看墨, research = 看水, persona / debate = 看文) keep their
  // line-art SVGs because no action-icon PNG exists for them (the fox-named
  // PNGs are LORE HOUSE illustrations, not action glyphs).
  const pngSrc: Partial<Record<ToolbarKind, string>> = {
    vault:        '/icons/vault.png',
    stats:        '/icons/stats.png',
    trends:       '/icons/trends.png',
    settings:     '/icons/settings.png',
    'voice-diff': '/icons/ai-touched.png',
  };
  const svgPaths: Partial<Record<ToolbarKind, React.ReactNode>> = {
    persona:      <><circle cx="6" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" fill="none"/><circle cx="12" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M2 15c0-2 2-3.5 4-3.5s4 1.5 4 3.5 M8 15c0-2 2-3.5 4-3.5s4 1.5 4 3.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/></>,
    debate:       <><path d="M3 4h7l-2 4H3z M8 8h7l-2 4H8z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/></>,
    research:     <><circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.4" fill="none"/><path d="M11.2 11.2L14.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></>,
  };
  const src = pngSrc[kind];
  return (
    <button
      type="button"
      onClick={onClick}
      data-tour-id={tourId}
      aria-label={title ?? kind}
      title={isEdgeFox ? `${title} · 端侧（本地向量检索）` : title}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        color: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Uniform 20×20 outer box. Bold/filled icons (ai-touched sparkle) get
          a slight inner scale-down so their visual weight matches the line-art
          icons that have thin strokes (r4 user 2026-05-12). */}
      {src ? (
        <span style={{ display: 'block', width: 20, height: 20, position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={title ?? kind}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              transform: kind === 'voice-diff' ? 'scale(0.78)' : 'scale(1)',
              transformOrigin: 'center',
            }}
          />
        </span>
      ) : (
        <svg width="20" height="20" viewBox="0 0 18 18" style={{ display: 'block', width: 20, height: 20 }}>
          {title && <title>{title}</title>}
          {svgPaths[kind]}
        </svg>
      )}
      {isEdgeFox && (
        <span
          aria-hidden
          data-testid="fox-edge-badge"
          style={{
            position: 'absolute',
            right: -3,
            bottom: -3,
            fontSize: 7,
            lineHeight: '10px',
            padding: '0 2px',
            borderRadius: 5,
            background: '#1F5B47',
            color: '#FBFAF7',
            fontFamily: '"Noto Serif SC", serif',
            fontWeight: 600,
            letterSpacing: 0.3,
            boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
          }}
        >
          端
        </span>
      )}
    </button>
  );
}

export function BudgetChip() {
  const remaining = useZhihuBudgetStore((s) => s.remaining);
  // Cross-tab + manual-clear sync: when another tab (or presenter via
  // devtools `localStorage.removeItem`) modifies the budget key, re-hydrate.
  // Persona-review 2026-05-10 吴敏 P1: chip was unrecoverable mid-demo.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'kanshan-zhihu-budget' || e.key === null) {
        useZhihuBudgetStore.persist?.rehydrate?.();
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);
  const shi = remaining('hot_list');
  const sou = remaining('zhihu_search');
  const da  = remaining('zhida');
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`今日剩余额度: 选题灵感 ${shi} 次, 考据检索 ${sou} 次, 直答问答 ${da} 次`}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '2px 6px', fontSize: 10, letterSpacing: 0.6,
        color: 'rgba(192,178,148,0.92)',
        fontFamily: '"Noto Sans SC", sans-serif',
        // Without these, opening a second editor tab makes the tab strip
        // overflow and the chip's spans wrap into three vertical lines.
        // Keep the chip rigid; the tab strip can scroll horizontally instead.
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
      title="今日剩余额度 — 选题灵感 (看势热榜) / 考据检索 / 直答问答"
    >
      {/* Compact 答主-facing phrasing — drops 「剩」/「次」 suffix because the
          full text wrapped to 3 lines when the chrome strip got wide. Tooltip
          on the outer chip carries the long form so meaning is preserved. */}
      <span>灵感 {shi}</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>查证 {sou}</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>直答 {da}</span>
    </div>
  );
}

interface DemoPersonaBadgeProps {
  avatarUrls?: AccountAvatarUrls;
}

// Demo-day collapse (2026-05-13): the persona switcher was deleted. Now a
// non-interactive badge that just announces the inhabited persona. The real
// 知乎 identity sits in ZhihuBadge to the right.
export function DemoPersonaBadge({ avatarUrls = EMPTY_AVATAR_URLS }: DemoPersonaBadgeProps = {}) {
  const avatarUrl = avatarUrls.guwanxi;
  return (
    <div
      data-testid="demo-persona-badge"
      aria-label="演示角色: 顾婉昔"
      title="演示角色 · 顾婉昔"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '2px 6px', borderRadius: 4,
        background: 'transparent',
        color: 'rgba(168,155,126,0.8)', fontSize: 11,
        fontFamily: '"Noto Serif SC", serif',
      }}
    >
      {avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          width={24}
          height={24}
          style={{ width: 24, height: 24, borderRadius: 12, objectFit: 'cover', display: 'block' }}
        />
      )}
      <span style={{
        width: 18, height: 18, borderRadius: 9,
        background: 'rgba(232,179,51,0.4)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: '#fff',
      }}>顾</span>
      <span>顾婉昔</span>
      <span style={{
        marginLeft: 2, padding: '0 4px', borderRadius: 2,
        background: 'rgba(139,69,19,0.6)', color: '#fff',
        fontSize: 8, letterSpacing: 1,
      }}>演示</span>
    </div>
  );
}
