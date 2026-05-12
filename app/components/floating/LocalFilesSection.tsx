'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useEditorTabsStore } from '@/lib/store/editor-tabs';
import { useFolderHandleStore } from '@/lib/store/folder-handle';
import { useEditorStore } from '@/lib/store/editor';
import { useAccountStore } from '@/lib/store/account';
import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { useAiErrorStore } from '@/lib/store/ai-error';
import { supportsFSA } from '@/lib/io/fs-handles';
import { exportMarkdown } from '@/lib/io/exporters';
import { triggerDownload, safeFilename } from '@/lib/io/download';
import { formatRelative } from '@/components/editor/AutosaveIndicator';

const COLLAPSE_KEY = 'kanshan-vault-local-collapsed';

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 14px',
  fontSize: 12.5,
  color: '#3A2E20',
  borderBottom: '1px solid rgba(0,0,0,0.05)',
  fontFamily: '"Noto Sans SC", sans-serif',
};

const chipStyle: CSSProperties = {
  fontSize: 10.5,
  padding: '2px 8px',
  background: 'transparent',
  border: '1px solid rgba(0,0,0,0.16)',
  borderRadius: 3,
  cursor: 'pointer',
  color: '#5A4B3E',
  whiteSpace: 'nowrap',
  fontFamily: '"Noto Sans SC", sans-serif',
};

export function LocalFilesSection() {
  const docs = useEditorTabsStore((s) => s.docs);
  const activeId = useEditorTabsStore((s) => s.activeId);
  const switchTo = useEditorTabsStore((s) => s.switchTo);
  const closeTab = useEditorTabsStore((s) => s.closeTab);
  const renameDoc = useEditorTabsStore((s) => s.rename);
  const addTab = useEditorTabsStore((s) => s.addTab);
  const editor = useEditorStore((s) => s.editor);
  const account = useAccountStore((s) => s.active);
  const closeFloating = useFloatingWindowStore((s) => s.closeWindow);
  const pushErr = useAiErrorStore((s) => s.push);

  const handle = useFolderHandleStore((s) => s.handle);
  const folderName = useFolderHandleStore((s) => s.folderName);
  const bind = useFolderHandleStore((s) => s.bind);
  const unbind = useFolderHandleStore((s) => s.unbind);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  });
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [now, setNow] = useState<number>(() => Date.now());
  const fsaSupported = supportsFSA();

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);

  const toggle = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch { /* ignore */ }
      return next;
    });
  };

  const docList = Object.values(docs).sort((a, b) => b.lastSavedAt - a.lastSavedAt);

  const handleNew = () => {
    const used = docList
      .map((d) => /^untitled-(\d+)\.md$/.exec(d.filename)?.[1])
      .filter((m): m is string => Boolean(m))
      .map((n) => Number(n));
    const next = used.length > 0 ? Math.max(...used) + 1 : 1;
    addTab(`untitled-${next}.md`, '<p></p>', 'local');
  };

  const handleOpen = (id: string) => {
    switchTo(id);
    // Auto-close the floating window so the user lands on the editor.
    closeFloating();
  };

  const handleExport = (id: string) => {
    if (!editor) return;
    const doc = docs[id];
    if (!doc) return;
    if (activeId !== id) switchTo(id);
    setTimeout(() => {
      try {
        if (editor) triggerDownload(exportMarkdown(editor), safeFilename(doc.filename, 'md'));
      } catch (err) {
        pushErr({ message: err instanceof Error ? err.message : '导出失败' });
      }
    }, 50);
  };

  const handleRenameStart = (id: string, currentName: string) => {
    setRenaming(id);
    setRenameValue(currentName);
  };
  const handleRenameCommit = () => {
    if (!renaming) return;
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== docs[renaming]?.filename) {
      renameDoc(renaming, trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`);
    }
    setRenaming(null);
  };

  const handleBindFolder = async () => {
    const res = await bind(account);
    if (!res.ok && res.message) {
      pushErr({ message: res.message });
    } else if (res.ok) {
      // Folder bound; show a confirmation by toggling collapsed open.
      setCollapsed(false);
    }
  };

  const handleUnbindFolder = async () => {
    await unbind(account);
  };

  return (
    <div data-testid="vault-local-files-section" style={{ borderBottom: '2px solid rgba(0,0,0,0.08)', background: '#FFFEFA' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          background: 'linear-gradient(180deg, #F5EFE0 0%, #ECE3CD 100%)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          fontFamily: '"Noto Serif SC", serif',
        }}
      >
        <button
          type="button"
          data-testid="vault-local-toggle"
          onClick={toggle}
          aria-label={collapsed ? '展开' : '收起'}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: '#3A2E20',
            padding: 0,
            width: 18,
          }}
        >
          {collapsed ? '▸' : '▾'}
        </button>
        <span style={{ fontSize: 13, color: '#3A2E20', fontWeight: 600, letterSpacing: 1 }}>
          本地文稿
        </span>
        <span style={{ fontSize: 10.5, color: '#7A6655', fontFamily: 'JetBrains Mono, monospace' }}>
          {docList.length} 卷 · {handle ? `📂 ${folderName ?? '已绑定文件夹'}` : '浏览器内'}
        </span>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          data-testid="vault-local-new"
          onClick={handleNew}
          style={chipStyle}
        >
          + 新建
        </button>
        {fsaSupported ? (
          handle ? (
            <button
              type="button"
              data-testid="vault-folder-unbind"
              onClick={() => void handleUnbindFolder()}
              style={chipStyle}
              title="解除绑定（保留所有本地文稿）"
            >
              📂 解除绑定
            </button>
          ) : (
            <button
              type="button"
              data-testid="vault-folder-bind"
              onClick={() => void handleBindFolder()}
              style={chipStyle}
              title="把这些文稿同步到磁盘上的一个文件夹"
            >
              📂 绑定文件夹
            </button>
          )
        ) : (
          <span
            data-testid="vault-folder-bind-unsupported"
            title="本浏览器不支持本地文件夹同步（仅 Chromium 内核）"
            style={{ ...chipStyle, opacity: 0.4, cursor: 'not-allowed' }}
          >
            📂 (浏览器不支持)
          </span>
        )}
      </div>

      {!collapsed && (
        <div data-testid="vault-local-list">
          {docList.length === 0 && (
            <div style={{ ...rowStyle, color: '#9A8A75', fontStyle: 'italic', justifyContent: 'center' }}>
              没有文稿。点击「+ 新建」开始一篇。
            </div>
          )}
          {docList.map((doc) => (
            <div
              key={doc.id}
              data-testid={`vault-local-row-${doc.id}`}
              data-active={doc.id === activeId}
              style={{
                ...rowStyle,
                background: doc.id === activeId ? '#FAF8F3' : 'transparent',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: doc.dirty ? '#1772F6' : 'rgba(0,0,0,0.15)',
                }}
              />
              {renaming === doc.id ? (
                <input
                  data-testid={`vault-local-rename-input-${doc.id}`}
                  type="text"
                  value={renameValue}
                  autoFocus
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRenameCommit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameCommit();
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  style={{
                    flex: 1,
                    fontSize: 12.5,
                    padding: '2px 6px',
                    border: '1px solid rgba(0,0,0,0.18)',
                    borderRadius: 3,
                    fontFamily: 'JetBrains Mono, "Noto Sans SC", sans-serif',
                  }}
                />
              ) : (
                <span style={{ flex: 1, fontFamily: 'JetBrains Mono, "Noto Sans SC", sans-serif' }}>
                  {doc.filename}
                  {doc.source === 'disk' && (
                    <span style={{ marginLeft: 8, fontSize: 10, color: '#6E5A40' }}>📂</span>
                  )}
                </span>
              )}
              <span
                style={{ fontSize: 10.5, color: '#9A8A75', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {formatRelative(doc.lastSavedAt, now)}
              </span>
              <button
                type="button"
                data-testid={`vault-local-open-${doc.id}`}
                onClick={() => handleOpen(doc.id)}
                style={chipStyle}
              >
                打开
              </button>
              <button
                type="button"
                data-testid={`vault-local-rename-${doc.id}`}
                onClick={() => handleRenameStart(doc.id, doc.filename)}
                style={chipStyle}
              >
                重命名
              </button>
              <button
                type="button"
                data-testid={`vault-local-export-${doc.id}`}
                onClick={() => handleExport(doc.id)}
                style={chipStyle}
              >
                导出
              </button>
              <button
                type="button"
                data-testid={`vault-local-delete-${doc.id}`}
                onClick={() => {
                  if (window.confirm(`删除 ${doc.filename}？此操作不可撤销。`)) {
                    closeTab(doc.id);
                  }
                }}
                style={{ ...chipStyle, color: '#A14A3D', borderColor: 'rgba(161,74,61,0.45)' }}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LocalFilesSection;
