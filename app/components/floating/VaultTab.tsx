'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAccountStore } from '@/lib/store/account';
import { VaultEntry, type VaultEntryData } from '@/components/floating/VaultEntry';
import guwanxiSeed from '@/content/seed/vault-guwanxi.json';
import meSeed from '@/content/seed/vault-me.json';
import { ComplianceLine } from '@/components/compliance/ComplianceLine';
import { importFile, sniffFormat } from '@/lib/io/importers';
import { useAiErrorStore } from '@/lib/store/ai-error';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [ingestToast, setIngestToast] = useState<string | null>(null);
  const pushErr = useAiErrorStore((s) => s.push);
  const dragCounter = useRef(0);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setDragOver(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;
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
    [account, pushErr],
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

  function handleOpen(entry: VaultEntryData): void {
    console.log('TODO plan #15: open in editor', entry);
    setOpenMessage(`已借阅:${entry.title}`);
    setTimeout(() => setOpenMessage(null), 2000);
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
              <VaultEntry key={`vault-entry-${e.id}`} entry={e} onOpen={handleOpen} />
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

      <ComplianceLine>{COMPLIANCE_TEXT}</ComplianceLine>
    </div>
  );
}
