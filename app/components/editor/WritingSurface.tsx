'use client';

import { useState, type CSSProperties, type MouseEvent } from 'react';
import { Tab } from './Tab';
import { ComplianceStamp } from './ComplianceStamp';
import { PublishButton } from './PublishButton';
import { TipTapEditor, type SelectionPayload } from './TipTapEditor';
import { FormatRibbon } from './FormatRibbon';
import { FileMenuButtons } from './FileMenuButtons';
import { AutosaveIndicator } from './AutosaveIndicator';
import { FolderSync } from './FolderSync';
import { useEditorTabsStore } from '@/lib/store/editor-tabs';
import { useEditorStore } from '@/lib/store/editor';
import { useAccountStore } from '@/lib/store/account';
import { exportMarkdown } from '@/lib/io/exporters';
import { triggerDownload, safeFilename } from '@/lib/io/download';
import { MarginSealPopover } from '@/components/compliance/MarginSealPopover';
import { ToolbarIcon, BudgetChip, ProfileChip, useToolbarOpeners, type AccountAvatarUrls } from '@/components/chrome/TitleBar';
import { RightToolbar } from '@/components/chrome/RightToolbar';
import marginSeedsJson from '@/content/seed/margin-seals-demo.json';
import type { MarginSealSeed } from './margin-seal-from-seeds';

export type { SelectionPayload };

const MARGIN_SEEDS = marginSeedsJson as MarginSealSeed[];

export type WritingSurfaceProps = {
  onContextMenu?: (e: MouseEvent<HTMLDivElement>) => void;
  onSelectionChange?: (sel: SelectionPayload | null) => void;
  /** Selection passed back into the floating toolbar so AI dispatches carry it. */
  floatingToolbarSelection?: SelectionPayload | null;
  /** Pre-resolved avatar URLs (server-side via `getAccountAvatarUrls`). */
  avatarUrls?: AccountAvatarUrls;
};


const newTabButtonStyle: CSSProperties = {
  alignSelf: 'flex-end',
  height: 26,
  padding: '0 10px',
  marginLeft: 4,
  marginBottom: 4,
  fontSize: 13,
  lineHeight: 1,
  color: '#7A6655',
  background: 'transparent',
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: '"Noto Sans SC", sans-serif',
  flexShrink: 0,
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
  avatarUrls,
}: WritingSurfaceProps) {
  const openers = useToolbarOpeners();
  const docs = useEditorTabsStore((s) => s.docs);
  const activeId = useEditorTabsStore((s) => s.activeId);
  const addTab = useEditorTabsStore((s) => s.addTab);
  const closeTab = useEditorTabsStore((s) => s.closeTab);
  const switchTo = useEditorTabsStore((s) => s.switchTo);
  const account = useAccountStore((s) => s.active);
  const editor = useEditorStore((s) => s.editor);
  const [pendingClose, setPendingClose] = useState<string | null>(null);

  const tabList = Object.values(docs).sort((a, b) => a.id.localeCompare(b.id));
  const pendingCloseDoc = pendingClose ? docs[pendingClose] ?? null : null;

  const handleNewTab = () => {
    // Compute the next untitled-N from current tabs.
    const used = tabList
      .map((d) => /^untitled-(\d+)\.md$/.exec(d.filename)?.[1])
      .filter((m): m is string => Boolean(m))
      .map((n) => Number(n));
    const next = used.length > 0 ? Math.max(...used) + 1 : 1;
    addTab(`untitled-${next}.md`, '<p></p>', 'local');
  };

  const handleCloseRequest = (id: string) => {
    const doc = docs[id];
    if (!doc) return;
    // Empty doc closes immediately — nothing to lose.
    const text = doc.htmlContent.replace(/<[^>]+>/g, '').trim();
    if (text.length === 0) {
      closeTab(id);
      return;
    }
    setPendingClose(id);
  };

  const handleConfirmDiscard = () => {
    if (pendingClose) closeTab(pendingClose);
    setPendingClose(null);
  };

  const handleConfirmExportThenClose = () => {
    if (!pendingClose || !editor) {
      setPendingClose(null);
      return;
    }
    const doc = docs[pendingClose];
    if (doc) {
      // Switch to the closing doc first so the export reads its content.
      if (activeId !== doc.id) switchTo(doc.id);
      // Defer export to next tick so the editor mirrors the doc.
      setTimeout(() => {
        if (editor) {
          try {
            triggerDownload(exportMarkdown(editor), safeFilename(doc.filename, 'md'));
          } catch { /* swallow — user can re-export */ }
        }
        closeTab(doc.id);
        setPendingClose(null);
      }, 50);
    } else {
      setPendingClose(null);
    }
  };

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
        {tabList.map((t) => (
          <Tab
            key={t.id}
            filename={t.filename}
            active={t.id === activeId}
            dirty={t.dirty}
            onClick={() => switchTo(t.id)}
            onClose={() => handleCloseRequest(t.id)}
          />
        ))}
        <button
          type="button"
          data-testid="tab-new"
          onClick={handleNewTab}
          style={newTabButtonStyle}
          title="新建文稿"
        >
          + 新建
        </button>
        {/* Demo-flow + presentation persona-review 2026-05-11 R2 P0: the
            locked tagline 「灵感激发 · 思路梳理 · 内容精加工」 was previously
            only inside the orphan <TitleBar /> component (never mounted).
            Anchored here in the tab strip where chrome already lives. */}
        <div style={{ flex: 1, minWidth: 16 }} />
        <AutosaveIndicator />
        <div style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.18)', margin: '0 12px' }} />
        {/* 2026-05-11 phase #15.5: 文件 cluster — 导入/导出 sits with the other
            tab-strip chrome controls instead of crowding the tabs list. */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingRight: 4, flexShrink: 0, whiteSpace: 'nowrap' }}>
          <span aria-hidden style={{ fontSize: 9, letterSpacing: 1.5, color: 'rgba(122,102,85,0.6)', fontFamily: 'JetBrains Mono, monospace' }}>文件</span>
          <FileMenuButtons />
        </div>
        <div style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.18)', margin: '0 8px', flexShrink: 0 }} />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#7A6655', fontSize: 12, paddingRight: 12, flexShrink: 0, whiteSpace: 'nowrap' }}>
          {/* R3 fix (user 2026-05-12): top-bar = daily 4 foxes only
              (shi/dian/mo/shui). The advanced 5 (wen persona+debate / wen2
              custom-mask / jing stats / xin compliance / 看山 chat) live in
              the right toolbar as selection-driven dispatchers. Removes the
              persona / debate / stats redundancy that judges flagged in R2/R3
              (same fox in two places doing the same thing). */}
          <span aria-hidden style={{ fontSize: 9, letterSpacing: 1.5, color: 'rgba(122,102,85,0.6)', fontFamily: 'JetBrains Mono, monospace' }}>日常</span>
          <ToolbarIcon kind="trends" onClick={openers.onOpenTrends} title="看势 · 热榜雷达 — 选题灵感" />
          <ToolbarIcon kind="vault" onClick={openers.onOpenVault} title="看典 · 档案库 — 旧稿再用" />
          <ToolbarIcon kind="voice-diff" onClick={openers.onOpenVoiceDiff} title="看墨 · 润色 — 按你的语风重写" />
          <ToolbarIcon kind="research" onClick={openers.onOpenResearch} title="看水 · 考据卷 — 出处可溯" />
          <span style={{ width: 1, height: 14, background: 'rgba(0,0,0,0.2)' }} aria-hidden />
          <ToolbarIcon kind="settings" onClick={openers.onOpenSettings} title="看山书房 · 设置" />
          <BudgetChip />
          <ProfileChip avatarUrls={avatarUrls} />
        </div>
      </div>

      <FormatRibbon />

      <div data-testid="editor-body" style={scrollRegionStyle}>
        <TipTapEditor
          marginSeeds={MARGIN_SEEDS}
          onSelectionChange={onSelectionChange}
        />
      </div>

      {pendingCloseDoc && (
        <div
          data-testid="close-tab-confirm"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3500,
          }}
        >
          <div
            style={{
              background: '#FFFDF7',
              border: '1px solid rgba(0,0,0,0.18)',
              borderRadius: 8,
              padding: 22,
              maxWidth: 380,
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#1A1F2A' }}>
              关闭 {pendingCloseDoc.filename}？
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.7, color: '#5A4B3E', marginBottom: 16 }}>
              关闭后内容会从本工作台移除（{account === 'guwanxi' ? '顾婉昔' : '我'} 账号 · 本地存储）。
              如果未来还想用，先导出 .md 到磁盘保留一份。
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                data-testid="close-tab-cancel"
                onClick={() => setPendingClose(null)}
                style={{
                  padding: '7px 14px',
                  fontSize: 12,
                  background: 'transparent',
                  border: '1px solid rgba(0,0,0,0.18)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  color: '#5A4B3E',
                  fontFamily: '"Noto Sans SC", sans-serif',
                }}
              >
                取消
              </button>
              <button
                type="button"
                data-testid="close-tab-export-then-close"
                onClick={handleConfirmExportThenClose}
                style={{
                  padding: '7px 14px',
                  fontSize: 12,
                  background: '#D9C8A5',
                  border: '1px solid #A89070',
                  borderRadius: 4,
                  cursor: 'pointer',
                  color: '#3A2E20',
                  fontFamily: '"Noto Sans SC", sans-serif',
                }}
              >
                导出 .md 后关闭
              </button>
              <button
                type="button"
                data-testid="close-tab-discard"
                onClick={handleConfirmDiscard}
                style={{
                  padding: '7px 14px',
                  fontSize: 12,
                  background: '#2A2419',
                  border: '1px solid #2A2419',
                  borderRadius: 4,
                  cursor: 'pointer',
                  color: '#FAF8F3',
                  fontFamily: '"Noto Sans SC", sans-serif',
                }}
              >
                丢弃
              </button>
            </div>
          </div>
        </div>
      )}

      <ComplianceStamp />
      <PublishButton />

      <RightToolbar selection={floatingToolbarSelection ?? null} />
      <MarginSealPopover />
      <FolderSync />
    </div>
  );
}

export default WritingSurface;
