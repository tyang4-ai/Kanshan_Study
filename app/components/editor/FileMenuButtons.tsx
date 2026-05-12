'use client';

import { useRef, useState, useEffect, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

const canPortal = (): boolean => typeof document !== 'undefined';
import { useEditorStore } from '@/lib/store/editor';
import { useEditorTabsStore } from '@/lib/store/editor-tabs';
import { useAiErrorStore } from '@/lib/store/ai-error';
import { importFile } from '@/lib/io/importers';
import {
  exportMarkdown,
  exportText,
  exportHtml,
  exportDocx,
  exportPdf,
} from '@/lib/io/exporters';
import { triggerDownload, safeFilename } from '@/lib/io/download';
import { DEFAULT_DOC_HTML } from '@/content/seed/default-document.html';

type ExportFmt = 'md' | 'txt' | 'html' | 'docx' | 'pdf';

// Visual rhythm: matches the autosave / ToolbarIcon text chips in the tab
// strip — same color family, small caps-ish letterspacing, no heavy fill.
const chipStyle: CSSProperties = {
  height: 18,
  padding: '0 8px',
  fontSize: 10.5,
  letterSpacing: 0.4,
  color: '#7A6655',
  background: 'transparent',
  border: '1px solid rgba(122,102,85,0.25)',
  borderRadius: 3,
  cursor: 'pointer',
  fontFamily: '"Noto Sans SC", sans-serif',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  whiteSpace: 'nowrap',
};

const menuStyle: CSSProperties = {
  position: 'fixed',
  background: '#FFFDF7',
  border: '1px solid rgba(0,0,0,0.16)',
  borderRadius: 6,
  boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
  padding: 4,
  zIndex: 3500,
  minWidth: 152,
  fontSize: 11.5,
  fontFamily: '"Noto Sans SC", sans-serif',
};

const menuItemStyle: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 4,
  cursor: 'pointer',
  color: '#3A2E20',
  whiteSpace: 'nowrap',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
};

const EXPORT_FORMATS: { fmt: ExportFmt; label: string; ext: string }[] = [
  { fmt: 'md', label: 'Markdown', ext: '.md' },
  { fmt: 'docx', label: 'Word', ext: '.docx' },
  { fmt: 'pdf', label: 'PDF', ext: '.pdf' },
  { fmt: 'html', label: 'HTML', ext: '.html' },
  { fmt: 'txt', label: '纯文本', ext: '.txt' },
];

export function FileMenuButtons() {
  const editor = useEditorStore((s) => s.editor);
  const rename = useEditorTabsStore((s) => s.rename);
  const activeId = useEditorTabsStore((s) => s.activeId);
  const activeTab = useEditorTabsStore((s) => (s.activeId ? s.docs[s.activeId] ?? null : null));
  const pushErr = useAiErrorStore((s) => s.push);
  const inputRef = useRef<HTMLInputElement>(null);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const [exportMenu, setExportMenu] = useState<{ x: number; y: number } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    if (!exportMenu) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (exportBtnRef.current?.contains(target)) return;
      const menu = document.querySelector('[data-testid="file-menu-export-menu"]');
      if (menu && menu.contains(target)) return;
      setExportMenu(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [exportMenu]);

  function openPicker() {
    inputRef.current?.click();
  }

  function openExportMenu() {
    const r = exportBtnRef.current?.getBoundingClientRect();
    if (!r) return;
    setExportMenu({ x: r.left, y: r.bottom + 4 });
  }

  async function applyFile(file: File) {
    if (!editor) return;
    try {
      const { html } = await importFile(file);
      editor.commands.setContent(html, { emitUpdate: true });
      const base = file.name.replace(/\.(md|markdown|txt|docx)$/i, '');
      if (activeId) rename(activeId, `${base}.md`);
      setPendingFile(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '导入失败';
      pushErr({ message: msg });
      setPendingFile(null);
    }
  }

  function onPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editor) return;
    const currentHtml = editor.getHTML().trim();
    const seedHtml = DEFAULT_DOC_HTML.trim();
    const isPristine =
      currentHtml === seedHtml || editor.state.doc.textContent.trim().length === 0;
    if (isPristine) {
      void applyFile(file);
    } else {
      setPendingFile(file);
    }
  }

  async function doExport(fmt: ExportFmt) {
    setExportMenu(null);
    if (!editor) return;
    const base = activeTab?.filename ?? '看山书房稿件.md';
    try {
      if (fmt === 'md') {
        triggerDownload(exportMarkdown(editor), safeFilename(base, 'md'));
      } else if (fmt === 'txt') {
        triggerDownload(exportText(editor), safeFilename(base, 'txt'));
      } else if (fmt === 'html') {
        triggerDownload(exportHtml(editor), safeFilename(base, 'html'));
      } else if (fmt === 'docx') {
        triggerDownload(await exportDocx(editor), safeFilename(base, 'docx'));
      } else if (fmt === 'pdf') {
        const container = document.querySelector('[data-testid="tiptap-editor"]') as HTMLElement | null;
        if (!container) throw new Error('编辑器未挂载');
        triggerDownload(await exportPdf(container), safeFilename(base, 'pdf'));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '导出失败';
      pushErr({ message: msg });
    }
  }

  return (
    <div
      data-testid="file-menu-buttons"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
      }}
    >
      <input
        ref={inputRef}
        data-testid="file-menu-input"
        type="file"
        accept=".md,.markdown,.txt,.docx,text/markdown,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onPicked}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        data-testid="file-menu-import"
        onClick={openPicker}
        style={chipStyle}
        className="kanshan-focus-ring kanshan-btn-press"
        title="从磁盘导入 .md / .txt / .docx"
      >
        导入
      </button>
      <button
        type="button"
        ref={exportBtnRef}
        data-testid="file-menu-export"
        onClick={openExportMenu}
        style={chipStyle}
        className="kanshan-focus-ring kanshan-btn-press"
        title="导出当前稿件"
      >
        导出 ▾
      </button>

      {canPortal() && exportMenu &&
        createPortal(
          <div
            data-testid="file-menu-export-menu"
            style={{ ...menuStyle, left: exportMenu.x, top: exportMenu.y }}
          >
            {EXPORT_FORMATS.map((f) => (
              <div
                key={f.fmt}
                data-testid={`file-menu-export-${f.fmt}`}
                style={menuItemStyle}
                onClick={() => void doExport(f.fmt)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = '#F2EAD3';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                <span>{f.label}</span>
                <span style={{ color: '#9A8A75', fontFamily: 'JetBrains Mono, monospace' }}>{f.ext}</span>
              </div>
            ))}
          </div>,
          document.body,
        )}

      {pendingFile && canPortal() &&
        createPortal(
          <div
            data-testid="file-menu-dirty-confirm"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3600,
            }}
          >
            <div
              style={{
                background: '#FFFDF7',
                border: '1px solid rgba(0,0,0,0.18)',
                borderRadius: 8,
                padding: 22,
                maxWidth: 360,
                fontFamily: '"Noto Sans SC", sans-serif',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#1A1F2A' }}>覆盖当前稿件？</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.7, color: '#5A4B3E', marginBottom: 16 }}>
                导入 <strong>{pendingFile.name}</strong> 会替换编辑器里现有的内容。
                当前稿件已自动保存在本地（localStorage），如需保留请先点导出。
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  data-testid="file-menu-dirty-cancel"
                  onClick={() => setPendingFile(null)}
                  style={{ ...chipStyle, height: 26, padding: '0 12px', fontSize: 12 }}
                >
                  取消
                </button>
                <button
                  type="button"
                  data-testid="file-menu-dirty-confirm-btn"
                  onClick={() => void applyFile(pendingFile)}
                  style={{
                    ...chipStyle,
                    height: 26,
                    padding: '0 12px',
                    fontSize: 12,
                    background: '#D9C8A5',
                    borderColor: '#A89070',
                    color: '#3A2E20',
                  }}
                >
                  覆盖导入
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default FileMenuButtons;
