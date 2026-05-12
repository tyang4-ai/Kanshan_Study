'use client';

import { type CSSProperties, type MouseEvent } from 'react';
import { Tab } from './Tab';
import { ComplianceStamp } from './ComplianceStamp';
import { PublishButton } from './PublishButton';
import { TipTapEditor, type SelectionPayload } from './TipTapEditor';
import { FormatRibbon } from './FormatRibbon';
import { FileMenuButtons } from './FileMenuButtons';
import { useEditorTabsStore } from '@/lib/store/editor-tabs';
import { MarginSealPopover } from '@/components/compliance/MarginSealPopover';
import { ToolbarIcon, BudgetChip, ProfileChip, useToolbarOpeners } from '@/components/chrome/TitleBar';
import { RightToolbar } from '@/components/chrome/RightToolbar';
import { DEFAULT_DOC_HTML } from '@/content/seed/default-document.html';
import marginSeedsJson from '@/content/seed/margin-seals-demo.json';
import type { MarginSealSeed } from './margin-seal-from-seeds';

export type { SelectionPayload };

const MARGIN_SEEDS = marginSeedsJson as MarginSealSeed[];

export type WritingSurfaceProps = {
  onContextMenu?: (e: MouseEvent<HTMLDivElement>) => void;
  onSelectionChange?: (sel: SelectionPayload | null) => void;
  /** Selection passed back into the floating toolbar so AI dispatches carry it. */
  floatingToolbarSelection?: SelectionPayload | null;
};


const outerStyle: CSSProperties = {
  flex: 1,
  height: '100%',
  minWidth: 0,
  background: '#FAF8F3',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: 'inset 1px 0 0 rgba(0,0,0,0.06)',
};

const tabStripStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 0,
  background: '#EDE9DF',
  borderBottom: '1px solid rgba(0,0,0,0.08)',
  height: 36,
  paddingLeft: 12,
  userSelect: 'none',
  fontFamily: '"Noto Sans SC", "Source Han Sans SC", sans-serif',
  overflowX: 'auto',
  overflowY: 'hidden',
  flexShrink: 0,
  scrollbarWidth: 'none',
};

const autosaveStyle: CSSProperties = {
  padding: '0 14px',
  fontSize: 11,
  color: '#7A6655',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexShrink: 0,
  whiteSpace: 'nowrap',
};

const scrollRegionStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  position: 'relative',
};

export function WritingSurface({
  onContextMenu,
  onSelectionChange,
  floatingToolbarSelection,
}: WritingSurfaceProps) {
  const openers = useToolbarOpeners();
  const tabs = useEditorTabsStore((s) => s.tabs);

  return (
    <div onContextMenu={onContextMenu} style={outerStyle}>
      {/* R5 casual user (Sun Yulin) P0: locked tagline 「灵感激发 · 思路梳理 ·
          内容精加工」 was truncated to 「灵感激发 · 思路梳」 inside the busy tab
          strip. Promoted to its own slim band above the tabs so it always fits. */}
      <div
        data-testid="titlebar-tagline"
        title="灵感激发 · 思路梳理 · 内容精加工"
        style={{
          flexShrink: 0,
          height: 22,
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          background: 'linear-gradient(180deg, #3A3633 0%, #2E2B28 100%)',
          borderBottom: '1px solid #1A1815',
          color: 'rgba(168,155,126,0.85)',
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 11,
          letterSpacing: 2,
          gap: 12,
        }}
      >
        <span style={{ color: '#C0B294', fontWeight: 600 }}>看山书房</span>
        <span aria-hidden style={{ opacity: 0.5 }}>·</span>
        <span>灵感激发 · 思路梳理 · 内容精加工</span>
      </div>
      <div style={tabStripStyle}>
        {tabs.map((t) => (
          <Tab key={t.filename} filename={t.filename} active={t.active} dirty={t.dirty} />
        ))}
        {/* Demo-flow + presentation persona-review 2026-05-11 R2 P0: the
            locked tagline 「灵感激发 · 思路梳理 · 内容精加工」 was previously
            only inside the orphan <TitleBar /> component (never mounted).
            Anchored here in the tab strip where chrome already lives. */}
        <div style={{ flex: 1, minWidth: 16 }} />
        <div style={autosaveStyle}>
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: 3,
              background: '#2ECC71',
            }}
          />
          已自动保存 · 16:42
        </div>
        <div style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.18)', margin: '0 12px' }} />
        {/* 2026-05-11 phase #15.5: 文件 cluster — 导入/导出 sits with the other
            tab-strip chrome controls instead of crowding the tabs list. */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingRight: 4 }}>
          <span aria-hidden style={{ fontSize: 9, letterSpacing: 1.5, color: 'rgba(122,102,85,0.6)', fontFamily: 'JetBrains Mono, monospace' }}>文件</span>
          <FileMenuButtons />
        </div>
        <div style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.18)', margin: '0 8px' }} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#7A6655', fontSize: 12, paddingRight: 12 }}>
          {/* Talk-to cluster — the 4 agents the user converses with directly.
              看山 chat lives in the bottom-right floating bubble (KanshanChatBubble). */}
          <span aria-hidden style={{ fontSize: 9, letterSpacing: 1.5, color: 'rgba(122,102,85,0.6)', fontFamily: 'JetBrains Mono, monospace' }}>对话</span>
          <ToolbarIcon kind="persona" onClick={openers.onOpenPersona} title="看文 · 读者反应" />
          <ToolbarIcon kind="debate" onClick={openers.onOpenDebate} title="看文 · 看纹辩论" />
          <ToolbarIcon kind="stats" onClick={openers.onOpenStats} title="看镜 · 数据看板" />
          <span style={{ width: 1, height: 14, background: 'rgba(0,0,0,0.2)' }} aria-hidden />
          {/* Tool cluster — surfaces 看山 dispatches; also user-launchable. */}
          <span aria-hidden style={{ fontSize: 9, letterSpacing: 1.5, color: 'rgba(122,102,85,0.6)', fontFamily: 'JetBrains Mono, monospace' }}>工具</span>
          <ToolbarIcon kind="vault" onClick={openers.onOpenVault} title="看典 · 档案库" />
          <ToolbarIcon kind="trends" onClick={openers.onOpenTrends} title="看势 · 热榜雷达" />
          <ToolbarIcon kind="settings" onClick={openers.onOpenSettings} title="看山书房 · 设置" />
          <BudgetChip />
          <ProfileChip />
        </div>
      </div>

      <FormatRibbon />

      <div data-testid="editor-body" style={scrollRegionStyle}>
        <TipTapEditor
          content={DEFAULT_DOC_HTML}
          marginSeeds={MARGIN_SEEDS}
          onSelectionChange={onSelectionChange}
        />
      </div>

      <ComplianceStamp />
      <PublishButton />

      <RightToolbar selection={floatingToolbarSelection ?? null} />
      <MarginSealPopover />
    </div>
  );
}

export default WritingSurface;
