'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAccountStore } from '@/lib/store/account';
import { useVaultConsentStore } from '@/lib/store/vault-consent';
import { VaultEntry, type VaultEntryData } from '@/components/floating/VaultEntry';
import guwanxiSeed from '@/content/seed/vault-guwanxi.json';
import meSeed from '@/content/seed/vault-me.json';
import { ComplianceLine } from '@/components/compliance/ComplianceLine';
import { importFile, importMarkdown, sniffFormat } from '@/lib/io/importers';
import { useAiErrorStore } from '@/lib/store/ai-error';
import { LocalFilesSection } from '@/components/floating/LocalFilesSection';
import { triggerDownload, safeFilename } from '@/lib/io/download';
import { useEditorTabsStore } from '@/lib/store/editor-tabs';
import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { exportMarkdownFromText, exportDocxFromText } from '@/lib/io/exporters';

const VAULT_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: '医学', label: '医学' },
  { id: '随笔', label: '随笔' },
  { id: '草稿', label: '草稿' },
];

const COMPLIANCE_TEXT = '档案不入第三方训练集 · 仅你可见';

interface ApiHit {
  // server may return seed shape (when source='seed' or 'seed-fallback')
  id?: string;
  title?: string;
  snippet?: string;
  year?: string;
  date?: string;
  words?: number;
  borrows?: number;
  draft?: boolean;
  tags?: string[];
  spine?: string;
  // or VaultHit shape (when source='live')
  chunkId?: string;
  articleId?: string;
  content?: string;
  spineColor?: string | null;
  score?: number;
}

interface SearchResponse {
  hits: ApiHit[];
  source: 'seed' | 'seed-fallback' | 'live';
}

function normalizeHit(hit: ApiHit): VaultEntryData | null {
  // seed shape
  if (hit.id && hit.title && hit.snippet !== undefined && hit.year && hit.date) {
    return {
      id: hit.id,
      title: hit.title,
      snippet: hit.snippet,
      year: hit.year,
      date: hit.date,
      words: hit.words ?? 0,
      borrows: hit.borrows ?? 0,
      draft: hit.draft,
      tags: hit.tags ?? [],
      spine: hit.spine,
    };
  }
  // VaultHit shape
  if (hit.articleId && hit.title && hit.date && hit.content) {
    return {
      id: hit.articleId,
      title: hit.title,
      snippet: hit.content,
      year: hit.date.slice(0, 4),
      date: hit.date,
      words: 0,
      borrows: hit.borrows ?? 0,
      tags: hit.tags ?? [],
      spine: hit.spineColor ?? undefined,
    };
  }
  return null;
}

interface VaultTabProps {
  scrollToArticleId?: string;
}

export function VaultTab({ scrollToArticleId }: VaultTabProps = {}) {
  const account = useAccountStore((s) => s.active);
  const consented = useVaultConsentStore((s) => s.consented);
  const hydrateConsent = useVaultConsentStore((s) => s.hydrate);
  const acceptConsent = useVaultConsentStore((s) => s.accept);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [ingestToast, setIngestToast] = useState<string | null>(null);
  const [consentBanner, setConsentBanner] = useState(false);
  const pushErr = useAiErrorStore((s) => s.push);
  const dragCounter = useRef(0);

  useEffect(() => {
    hydrateConsent(account);
  }, [account, hydrateConsent]);

  const consentEffective = account === 'guwanxi' || consented;

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setDragOver(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;
      if (!consentEffective) {
        setConsentBanner(true);
        return;
      }
      for (const file of files) {
        if (sniffFormat(file) === 'unknown') {
          pushErr({ message: `${file.name} 格式不支持（只接受 .md / .txt / .docx）` });
          continue;
        }
        try {
          const { html } = await importFile(file);
          // Mammoth + marked output is HTML; for ingest we strip back to
          // plain text so the chunker sees Markdown-like paragraph breaks.
          const text = html
            .replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, '\n\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          const title = file.name.replace(/\.[^.]+$/, '');
          const res = await fetch('/api/vault/ingest', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-kanshan-account': account,
              'x-kanshan-vault-consent': consentEffective ? '1' : '0',
            },
            body: JSON.stringify({ markdown: text, title }),
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as { error?: string };
            pushErr({ message: data.error ?? `${file.name} 入档失败 (${res.status})`, status: res.status });
            continue;
          }
          const data = (await res.json()) as { chunks: number; title: string };
          setIngestToast(`已收入档案库 · 看典登记 ${data.chunks} 段 · ${data.title}`);
          setTimeout(() => setIngestToast(null), 3000);
        } catch (err) {
          const msg = err instanceof Error ? err.message : '入档失败';
          pushErr({ message: msg });
        }
      }
    },
    [account, pushErr, consentEffective],
  );

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    dragCounter.current += 1;
    setDragOver(true);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setDragOver(false);
  };

  useEffect(() => {
    if (!scrollToArticleId || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-article-id="${scrollToArticleId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [scrollToArticleId]);

  const initialEntries = useMemo<VaultEntryData[]>(
    () => (account === 'guwanxi' ? (guwanxiSeed as VaultEntryData[]) : (meSeed as VaultEntryData[])),
    [account]
  );

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  // searchResults overrides initialEntries when search has run; account change drops back to seed
  // (handled by derived `entries` below — the search effect re-fires on account change).
  const [searchResults, setSearchResults] = useState<VaultEntryData[] | null>(null);
  const entries = searchResults ?? initialEntries;
  const [openMessage, setOpenMessage] = useState<string | null>(null);
  const isComposingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bulk-action state (phase #15.9 Track 3).
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const handleExportAll = async (): Promise<void> => {
    if (bulkBusy) return;
    setBulkBusy(true);
    try {
      const res = await fetch('/api/vault/export-all', {
        method: 'GET',
        headers: { 'x-kanshan-account': account },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        pushErr({ message: data.error ?? `导出失败 (${res.status})`, status: res.status });
        return;
      }
      const data = (await res.json()) as unknown;
      const json = JSON.stringify(data, null, 2);
      const dateStamp = new Date().toISOString().slice(0, 10);
      const blob = new Blob([json], { type: 'application/json' });
      triggerDownload(blob, safeFilename(`vault-${account}-${dateStamp}`, 'json'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '导出失败';
      pushErr({ message: msg });
    } finally {
      setBulkBusy(false);
    }
  };

  const handleDeleteAll = async (): Promise<void> => {
    if (bulkBusy) return;
    if (deleteInput !== '删除全部') return;
    setBulkBusy(true);
    try {
      const res = await fetch('/api/vault/all', {
        method: 'DELETE',
        headers: { 'x-kanshan-account': account },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        pushErr({ message: data.error ?? `删除失败 (${res.status})`, status: res.status });
        return;
      }
      // Optimistically clear the rendered article list.
      setSearchResults([]);
      setConfirmDeleteOpen(false);
      setDeleteInput('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '删除失败';
      pushErr({ message: msg });
    } finally {
      setBulkBusy(false);
    }
  };

  const runSearch = async (q: string): Promise<void> => {
    try {
      const res = await fetch('/api/vault/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-kanshan-account': account,
        },
        body: JSON.stringify({ query: q, topK: 7 }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as SearchResponse;
      const normalized = data.hits
        .map(normalizeHit)
        .filter((e): e is VaultEntryData => e !== null);
      setSearchResults(normalized);
    } catch (err) {
      // Graceful fallback: keep current entries on error.
      console.error('vault search failed:', err);
    }
  };

  // Debounced search.
  useEffect(() => {
    if (isComposingRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, account]);

  const filtered = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter((e) => e.tags.includes(filter));
  }, [entries, filter]);

  const grouped = useMemo(() => {
    const m: Record<string, VaultEntryData[]> = {};
    // Dedupe by id before grouping — React 19 Strict Mode + debounced search
    // can briefly merge searchResults + initialEntries during reconciliation,
    // surfacing a duplicate-key warning (persona-review 2026-05-10 小李 P0).
    const seen = new Set<string>();
    for (const e of filtered) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      (m[e.year] ||= []).push(e);
    }
    return Object.entries(m).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [filtered]);

  const totalCount = initialEntries.length;

  // Per-entry delete confirm state (phase #15.9 Track 2).
  const [pendingDelete, setPendingDelete] = useState<VaultEntryData | null>(null);

  function handleOpen(entry: VaultEntryData): void {
    // 1. Already-open check: if any tab references this vault article, switch
    //    to it instead of opening a duplicate.
    const tabsState = useEditorTabsStore.getState();
    const existing = Object.values(tabsState.docs).find(
      (d) => d.source === 'vault' && d.vaultArticleId === entry.id,
    );
    if (existing) {
      tabsState.switchTo(existing.id);
    } else {
      // 2. Otherwise, open a new tab. The vault search route exposes either
      //    the snippet (seed) or the full content (live) on `entry.snippet`,
      //    so use that as the markdown body and convert to HTML for TipTap.
      const md = entry.snippet ?? '';
      const html = md ? importMarkdown(md) : '<p></p>';
      tabsState.addTab(safeFilename(entry.title, 'md'), html, 'vault', {
        vaultArticleId: entry.id,
      });
    }
    // 3. Bring editor into focus by closing the floating window (the vault
    //    panel is hosted there). Persona-review feedback: clicking 打开 should
    //    feel like "you're now editing", not "you're still in the catalog".
    useFloatingWindowStore.getState().closeWindow();
    setOpenMessage(`已借阅:${entry.title}`);
    setTimeout(() => setOpenMessage(null), 2000);
  }

  function handleExportMd(entry: VaultEntryData): void {
    const md = entry.snippet ?? '';
    triggerDownload(exportMarkdownFromText(md), safeFilename(entry.title, 'md'));
  }

  async function handleExportDocx(entry: VaultEntryData): Promise<void> {
    const md = entry.snippet ?? '';
    try {
      const blob = await exportDocxFromText(md);
      triggerDownload(blob, safeFilename(entry.title, 'docx'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '导出 .docx 失败';
      pushErr({ message: msg });
    }
  }

  function handleDelete(entry: VaultEntryData): void {
    setPendingDelete(entry);
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      const res = await fetch(`/api/vault/articles/${encodeURIComponent(target.id)}`, {
        method: 'DELETE',
        headers: { 'x-kanshan-account': account },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        pushErr({ message: data.error ?? `删除失败 (${res.status})`, status: res.status });
        return;
      }
      // Optimistic: drop from current list (whether searchResults or initial).
      setSearchResults((prev) =>
        (prev ?? initialEntries).filter((e) => e.id !== target.id),
      );
      // If this entry is open in an editor tab, close that tab — user
      // shouldn't keep editing a deleted vault doc.
      const tabsState = useEditorTabsStore.getState();
      const openTab = Object.values(tabsState.docs).find(
        (d) => d.source === 'vault' && d.vaultArticleId === target.id,
      );
      if (openTab) tabsState.closeTab(openTab.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '删除失败';
      pushErr({ message: msg });
    }
  }

  return (
    <div
      data-testid="vault-tab"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        width: '100%',
        height: '100%',
        background: '#FAFBFD',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Noto Serif SC", "Source Han Serif SC", serif',
        overflow: 'hidden',
        color: '#1A1815',
        position: 'relative',
      }}
    >
      {dragOver && (
        <div
          data-testid="vault-drop-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            background: 'rgba(44, 66, 88, 0.78)',
            color: '#FFFDF7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 12,
            border: '3px dashed rgba(255,255,255,0.5)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 22, fontFamily: '"Noto Serif SC", serif', letterSpacing: 2 }}>
            松手即可入档
          </div>
          <div style={{ fontSize: 12.5, color: '#C5D6E8', fontFamily: '"Noto Sans SC", sans-serif', letterSpacing: 0.5 }}>
            .md / .txt / .docx · 看典会登记入库
          </div>
        </div>
      )}
      {ingestToast && (
        <div
          data-testid="vault-ingest-toast"
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#2C4258',
            color: '#E8EEF5',
            padding: '6px 12px',
            borderRadius: 4,
            fontSize: 11.5,
            zIndex: 90,
            fontFamily: '"Noto Sans SC", sans-serif',
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          }}
        >
          {ingestToast}
        </div>
      )}
      {/* 头版 catalog header (no drag — TabbedFloatingWindow owns it) */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 14px',
          background: 'linear-gradient(180deg, #2C4258 0%, #1F2F40 100%)',
          color: '#E8EEF5',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            background: '#1772F6',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"Noto Serif SC", serif',
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 0 8px rgba(122,177,237,0.6)',
            flexShrink: 0,
          }}
        >
          典
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 1.5,
              fontFamily: '"Noto Serif SC", serif',
              color: '#E8EEF5',
              lineHeight: 1.1,
            }}
          >
            看典 · 档案库
          </div>
          <div
            style={{
              fontSize: 10,
              color: '#8FA1B6',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: 0.4,
              marginTop: 1,
              display: 'flex',
              gap: 10,
            }}
          >
            <span>VAULT · 共 {totalCount} 卷</span>
            <span>·</span>
            <span>沙狐当值</span>
          </div>
        </div>
      </div>

      {/* Bulk-action toolbar (phase #15.9 Track 3) */}
      <div
        data-testid="vault-bulk-toolbar"
        style={{
          flexShrink: 0,
          padding: '6px 16px',
          background: '#F4F7FB',
          borderBottom: '1px solid rgba(23,114,246,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 6,
        }}
      >
        <button
          type="button"
          data-testid="vault-export-all"
          onClick={handleExportAll}
          disabled={bulkBusy}
          style={{
            padding: '4px 10px',
            border: '1px solid #1772F6',
            borderRadius: 2,
            background: 'transparent',
            color: '#1772F6',
            fontFamily: '"Noto Serif SC", serif',
            fontSize: 11,
            letterSpacing: 1,
            cursor: bulkBusy ? 'not-allowed' : 'pointer',
            opacity: bulkBusy ? 0.5 : 1,
          }}
        >
          导出全部
        </button>
        <button
          type="button"
          data-testid="vault-delete-all"
          onClick={() => setConfirmDeleteOpen(true)}
          disabled={bulkBusy}
          style={{
            padding: '4px 10px',
            border: '1px solid #A8221C',
            borderRadius: 2,
            background: 'transparent',
            color: '#A8221C',
            fontFamily: '"Noto Serif SC", serif',
            fontSize: 11,
            letterSpacing: 1,
            cursor: bulkBusy ? 'not-allowed' : 'pointer',
            opacity: bulkBusy ? 0.5 : 1,
          }}
        >
          删除全部
        </button>
      </div>

      {/* Search + filter bar */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 16px',
          borderBottom: '1px solid rgba(23,114,246,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#F4F7FB',
        }}
      >
        <div
          style={{
            flex: 1,
            background: '#fff',
            border: '1px solid rgba(23,114,246,0.18)',
            borderRadius: 3,
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 14 14"
            fill="none"
            stroke="#1772F6"
            strokeWidth="1.5"
          >
            <circle cx="6" cy="6" r="4" />
            <path d="M9 9l3.5 3.5" />
          </svg>
          <input
            data-testid="vault-search-input"
            type="text"
            placeholder="检索书目、摘录、标签…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={(e) => {
              isComposingRef.current = false;
              setQuery(e.currentTarget.value);
            }}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: '"Noto Serif SC", serif',
              fontSize: 12.5,
              color: '#1A1815',
            }}
          />
          {query && (
            <button
              aria-label="clear search"
              onClick={() => setQuery('')}
              style={{
                border: 'none',
                background: 'none',
                color: '#1772F6',
                cursor: 'pointer',
                fontSize: 12,
                padding: 0,
              }}
            >
              ×
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {VAULT_FILTERS.map((f) => (
            <button
              key={f.id}
              data-testid={`vault-filter-${f.id}`}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '4px 9px',
                border: '1px solid #1772F6',
                borderRadius: 2,
                background: filter === f.id ? '#1772F6' : 'transparent',
                color: filter === f.id ? '#F4EAD0' : '#1A1F2A',
                fontFamily: '"Noto Serif SC", serif',
                fontSize: 11,
                letterSpacing: 1,
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {consentBanner && !consentEffective && (
        <div
          data-testid="vault-consent-banner"
          style={{
            flexShrink: 0,
            margin: '10px 16px 0',
            padding: '10px 14px',
            background: '#FFF6E3',
            border: '1px solid rgba(168,114,46,0.45)',
            borderRadius: 3,
            color: '#3A2E1A',
            fontSize: 12.5,
            fontFamily: '"Noto Serif SC", serif',
            lineHeight: 1.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span>档案库需要先同意条款。前往设置 → 看典 → 同意条款</span>
          <button
            type="button"
            data-testid="vault-consent-accept"
            onClick={() => {
              acceptConsent();
              setConsentBanner(false);
            }}
            style={{
              padding: '5px 10px',
              border: '1px solid #2A2419',
              borderRadius: 2,
              background: '#2A2419',
              color: '#FAF8F3',
              fontFamily: '"Noto Serif SC", serif',
              fontSize: 11.5,
              letterSpacing: 1,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            同意条款
          </button>
        </div>
      )}

      {/* 2026-05-11 phase #15.7: Local-files browser inserted above the year-
          grouped vault-API catalog. Answers "where are my files" for tabs
          living in localStorage + (Chromium) the optionally-bound FSA folder. */}
      <LocalFilesSection />

      {/* Catalog body */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 16px 24px',
        }}
      >
        {grouped.length === 0 && (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: '#1772F6',
              fontSize: 13,
              fontFamily: '"Noto Serif SC", serif',
              fontStyle: 'italic',
            }}
          >
            馆中无此书 · 请换一关键字
          </div>
        )}
        {grouped.map(([year, yearEntries]) => (
          <div key={`vault-year-${year}`} style={{ marginTop: 14 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                padding: '6px 0 6px',
                borderBottom: '1px solid rgba(23,114,246,0.18)',
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#1A1F2A',
                  letterSpacing: 4,
                }}
              >
                {year}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: '#1772F6',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: 0.5,
                }}
              >
                · {yearEntries.length} 卷
              </span>
              <span style={{ flex: 1 }} />
              <span
                style={{
                  fontSize: 10,
                  color: '#1772F6',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: 0.5,
                }}
              >
                架号 D-{year.slice(-2)}
              </span>
            </div>
            {yearEntries.map((e) => (
              <VaultEntry
                key={`vault-entry-${e.id}`}
                entry={e}
                onOpen={handleOpen}
                onExportMd={handleExportMd}
                onExportDocx={handleExportDocx}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ))}
      </div>

      {/* footer */}
      <div
        style={{
          flexShrink: 0,
          padding: '8px 16px',
          background: '#F4F7FB',
          borderTop: '1px solid rgba(23,114,246,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 10,
          color: '#1772F6',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: 0.5,
        }}
      >
        <span>
          显示 {filtered.length} / {totalCount} 卷
        </span>
        <span>每卷点击「展卷」可重新借阅至当前书桌</span>
      </div>

      {/* ephemeral 展卷 confirmation message */}
      {openMessage && (
        <div
          data-testid="vault-open-message"
          style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 14px',
            background: 'rgba(28, 36, 50, 0.92)',
            color: '#F4EAD0',
            fontSize: 11,
            fontFamily: '"Noto Serif SC", serif',
            letterSpacing: 1,
            borderRadius: 2,
            zIndex: 10,
          }}
        >
          {openMessage}
        </div>
      )}

      {pendingDelete && (
        <div
          data-testid="vault-delete-entry-modal"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 200,
            background: 'rgba(15, 22, 32, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setPendingDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FAFBFD',
              border: '1px solid #A8221C',
              borderRadius: 4,
              padding: '18px 20px',
              maxWidth: 360,
              width: '100%',
              boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: '"Noto Serif SC", serif',
                fontSize: 14,
                fontWeight: 600,
                color: '#A8221C',
                letterSpacing: 1,
              }}
            >
              确认从看典删除「{pendingDelete.title}」？
            </div>
            <div
              style={{
                fontFamily: '"Noto Serif SC", serif',
                fontSize: 12.5,
                color: '#1A1815',
                lineHeight: 1.6,
              }}
            >
              此操作不可撤销。
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                data-testid="vault-delete-entry-cancel"
                onClick={() => setPendingDelete(null)}
                style={{
                  padding: '5px 12px',
                  border: '1px solid #1A1815',
                  borderRadius: 2,
                  background: 'transparent',
                  color: '#1A1815',
                  fontFamily: '"Noto Serif SC", serif',
                  fontSize: 11.5,
                  letterSpacing: 1,
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                type="button"
                data-testid="vault-delete-entry-confirm"
                onClick={() => {
                  void confirmDelete();
                }}
                style={{
                  padding: '5px 12px',
                  border: '1px solid #A8221C',
                  borderRadius: 2,
                  background: '#A8221C',
                  color: '#FFFDF7',
                  fontFamily: '"Noto Serif SC", serif',
                  fontSize: 11.5,
                  letterSpacing: 1,
                  cursor: 'pointer',
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteOpen && (
        <div
          data-testid="vault-delete-all-modal"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 200,
            background: 'rgba(15, 22, 32, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => {
            if (!bulkBusy) {
              setConfirmDeleteOpen(false);
              setDeleteInput('');
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FAFBFD',
              border: '1px solid #A8221C',
              borderRadius: 4,
              padding: '18px 20px',
              maxWidth: 360,
              width: '100%',
              boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: '"Noto Serif SC", serif',
                fontSize: 15,
                fontWeight: 600,
                color: '#A8221C',
                letterSpacing: 1,
              }}
            >
              永久删除所有档案？
            </div>
            <div
              style={{
                fontFamily: '"Noto Serif SC", serif',
                fontSize: 12.5,
                color: '#1A1815',
                lineHeight: 1.6,
              }}
            >
              此操作不可撤销。要继续，请输入「删除全部」：
            </div>
            <input
              data-testid="vault-delete-all-input"
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              autoFocus
              style={{
                padding: '6px 10px',
                border: '1px solid rgba(168,34,28,0.45)',
                borderRadius: 2,
                fontFamily: '"Noto Serif SC", serif',
                fontSize: 13,
                color: '#1A1815',
                background: '#fff',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                data-testid="vault-delete-all-cancel"
                onClick={() => {
                  setConfirmDeleteOpen(false);
                  setDeleteInput('');
                }}
                disabled={bulkBusy}
                style={{
                  padding: '5px 12px',
                  border: '1px solid #1A1815',
                  borderRadius: 2,
                  background: 'transparent',
                  color: '#1A1815',
                  fontFamily: '"Noto Serif SC", serif',
                  fontSize: 11.5,
                  letterSpacing: 1,
                  cursor: bulkBusy ? 'not-allowed' : 'pointer',
                }}
              >
                取消
              </button>
              <button
                type="button"
                data-testid="vault-delete-all-confirm"
                onClick={handleDeleteAll}
                disabled={deleteInput !== '删除全部' || bulkBusy}
                style={{
                  padding: '5px 12px',
                  border: '1px solid #A8221C',
                  borderRadius: 2,
                  background: deleteInput === '删除全部' && !bulkBusy ? '#A8221C' : 'transparent',
                  color: deleteInput === '删除全部' && !bulkBusy ? '#FFFDF7' : '#A8221C',
                  fontFamily: '"Noto Serif SC", serif',
                  fontSize: 11.5,
                  letterSpacing: 1,
                  cursor: deleteInput === '删除全部' && !bulkBusy ? 'pointer' : 'not-allowed',
                  opacity: deleteInput === '删除全部' && !bulkBusy ? 1 : 0.5,
                }}
              >
                删除全部
              </button>
            </div>
          </div>
        </div>
      )}

      <ComplianceLine>{COMPLIANCE_TEXT}</ComplianceLine>
    </div>
  );
}
