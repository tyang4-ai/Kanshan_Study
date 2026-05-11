'use client';
// Phase #13.99 — talk-to / tool reframe (revision tag for HMR invalidation)
import { useEffect } from 'react';
import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { useAccountStore } from '@/lib/store/account';
import { useZhihuBudgetStore } from '@/lib/zhihu/budget';
import { useDemoMode } from '@/lib/demo-mode/context';

export type ToolbarKind = 'vault' | 'stats' | 'trends' | 'settings' | 'persona' | 'debate';

// Helper: opens each panel with the locked title.
export function useToolbarOpeners() {
  const openTab = useFloatingWindowStore((s) => s.openTab);
  return {
    onOpenVault:    () => openTab('vault', '看典 · 档案库'),
    onOpenTrends:   () => openTab('trends', '看势 · 热榜雷达'),
    onOpenStats:    () => openTab('stats', '看镜 · 数据看板'),
    onOpenSettings: () => openTab('settings', '看山书房 · 设置'),
    onOpenPersona:  () => openTab('persona', '看文 · 读者反应'),
    onOpenDebate:   () => openTab('debate', '看文 · 看纹辩论'),
  };
}

export function TitleBar() {
  const openTab = useFloatingWindowStore((s) => s.openTab);

  const onOpenVault    = () => openTab('vault', '看典 · 档案库');
  const onOpenTrends   = () => openTab('trends', '看势 · 热榜雷达');
  const onOpenStats    = () => openTab('stats', '看镜 · 数据看板');
  const onOpenSettings = () => openTab('settings', '看山书房 · 设置');
  const onOpenPersona  = () => openTab('persona', '看文 · 读者反应');
  const onOpenDebate   = () => openTab('debate', '看文 · 看纹辩论');

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
        {/* Tool cluster — surfaces dispatched by 看山, also user-launchable for direct access. */}
        <ToolbarIcon kind="vault" onClick={onOpenVault} title="看典 · 档案库"/>
        <ToolbarIcon kind="trends" onClick={onOpenTrends} title="看势 · 热榜雷达"/>
        <ToolbarIcon kind="settings" onClick={onOpenSettings} tourId="settings-button" title="看山书房 · 设置"/>
        <BudgetChip />
        <ProfileChip />
      </div>
    </div>
  );
}

export function ToolbarIcon({ kind, onClick, tourId, title }: { kind: ToolbarKind; onClick: () => void; tourId?: string; title?: string }) {
  const icons: Record<ToolbarKind, React.ReactNode> = {
    vault:    <path d="M3 5h12v9H3z M5 5V3h8v2 M3 9h12" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/>,
    stats:    <path d="M3 14V8 M7 14V4 M11 14V10 M15 14V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>,
    trends:   <><path d="M3 13l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="15" cy="6" r="1.2" fill="currentColor"/></>,
    settings: <><circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M9 1v3 M9 14v3 M1 9h3 M14 9h3 M3.4 3.4l2 2 M12.6 12.6l2 2 M3.4 14.6l2-2 M12.6 5.4l2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></>,
    persona:  <><circle cx="6" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" fill="none"/><circle cx="12" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" fill="none"/><path d="M2 15c0-2 2-3.5 4-3.5s4 1.5 4 3.5 M8 15c0-2 2-3.5 4-3.5s4 1.5 4 3.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/></>,
    debate:   <><path d="M3 4h7l-2 4H3z M8 8h7l-2 4H8z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/></>,
  };
  return (
    <button
      type="button"
      onClick={onClick}
      data-tour-id={tourId}
      aria-label={title ?? kind}
      title={title}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        color: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18">
        {title && <title>{title}</title>}
        {icons[kind]}
      </svg>
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
      aria-label={`知乎 API 每日剩余额度: 看势 ${shi} 分之 100, 搜索 ${sou} 分之 1000, 直答 ${da} 分之 100`}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '2px 6px', fontSize: 10, letterSpacing: 0.6,
        color: 'rgba(168,155,126,0.6)',
        fontFamily: 'JetBrains Mono, monospace',
      }}
      title="知乎 API 每日额度 — 看势(热榜) / 搜索 / 直答"
    >
      <span>看势 {shi}/100</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>搜索 {sou}/1000</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>直答 {da}/100</span>
    </div>
  );
}

export function ProfileChip() {
  const active = useAccountStore((s) => s.active);
  const switchTo = useAccountStore((s) => s.switchTo);
  const demoMode = useDemoMode();
  const label = active === 'guwanxi' ? '顾婉昔' : '我';
  const initial = active === 'guwanxi' ? '顾' : '我';
  const onClick = async () => {
    const target = active === 'guwanxi' ? 'me' : 'guwanxi';
    const targetLabel = target === 'guwanxi' ? '顾婉昔 (演示账号)' : '我的账号';
    // Per-account doc loading is post-MVP — for now we explicitly clear the
    // editor on switch so content doesn't leak across accounts (persona-review
    // 2026-05-10 吴敏 P0: previous copy "未保存的编辑内容会保留" was misleading;
    // dialog now matches what the code does).
    //
    // Demo-flow judge persona-review 2026-05-11 P0: in /live mode, skip the
    // native confirm() since the demo script intends to switch deterministically.
    // The native confirm freezes Chrome MCP automation for 45s+ and looks
    // jarring on a 腾讯会议 share.
    if (
      demoMode !== 'live' &&
      typeof window !== 'undefined' &&
      !window.confirm(`切换到 ${targetLabel}？\n\n当前编辑器内容会清空。`)
    ) {
      return;
    }
    // Clear editor before profile flips so the new account starts clean.
    try {
      const { useEditorStore } = await import('@/lib/store/editor');
      useEditorStore.getState().editor?.commands.setContent('');
    } catch {
      /* SSR / HMR boundary — store not loaded, skip */
    }
    switchTo(target);
  };
  return (
    <button
      onClick={onClick}
      data-tour-id="profile-chip"
      aria-label={`切换账号: 当前 ${label}, 点击切换到 ${active === 'guwanxi' ? '我的账号' : '顾婉昔 (演示账号)'}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '2px 6px', borderRadius: 4, border: 'none',
        background: 'transparent',
        color: 'rgba(168,155,126,0.8)', fontSize: 11, cursor: 'pointer',
        fontFamily: '"Noto Serif SC", serif',
      }}
      title={`切换到 ${active === 'guwanxi' ? '我的账号' : '顾婉昔 (演示)'}`}
    >
      <span style={{
        width: 18, height: 18, borderRadius: 9,
        background: 'rgba(232,179,51,0.4)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: '#fff',
      }}>{initial}</span>
      <span>{label}</span>
      {active === 'guwanxi' && (
        <span style={{
          marginLeft: 2, padding: '0 4px', borderRadius: 2,
          background: 'rgba(139,69,19,0.6)', color: '#fff',
          fontSize: 8, letterSpacing: 1,
        }}>演示</span>
      )}
    </button>
  );
}
