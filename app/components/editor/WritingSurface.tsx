'use client';

import { type CSSProperties, type MouseEvent } from 'react';
import { Tab } from './Tab';
import { ComplianceStamp } from './ComplianceStamp';
import { TipTapEditor, type SelectionPayload } from './TipTapEditor';
import { FormatRibbon } from './FormatRibbon';
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

type TabEntry = {
  filename: string;
  active: boolean;
  dirty: boolean;
};

const TABS: ReadonlyArray<TabEntry> = [
  { filename: '影像组学与基因组学.md', active: true, dirty: true },
  { filename: 'research-notes.md', active: false, dirty: false },
  { filename: 'readme.md', active: false, dirty: false },
];

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

  return (
    <div onContextMenu={onContextMenu} style={outerStyle}>
      <div style={tabStripStyle}>
        {TABS.map((t) => (
          <Tab key={t.filename} filename={t.filename} active={t.active} dirty={t.dirty} />
        ))}
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
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', color: '#7A6655', fontSize: 12, paddingRight: 12 }}>
          <ToolbarIcon kind="vault" onClick={openers.onOpenVault} />
          <ToolbarIcon kind="trends" onClick={openers.onOpenTrends} />
          <ToolbarIcon kind="stats" onClick={openers.onOpenStats} />
          <ToolbarIcon kind="settings" onClick={openers.onOpenSettings} />
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

      <RightToolbar selection={floatingToolbarSelection ?? null} />
    </div>
  );
}

export default WritingSurface;
