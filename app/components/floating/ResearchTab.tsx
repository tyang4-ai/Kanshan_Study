'use client';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ComplianceLine } from '@/components/compliance/ComplianceLine';
import { SourceRow } from '@/components/research/SourceRow';
import {
  TrendsConfirmModal,
  isTrendsAcknowledged,
  markTrendsAcknowledged,
} from '@/components/floating/TrendsConfirmModal';
import { useEditorStore } from '@/lib/store/editor';
import { useCorkboardStore } from '@/lib/store/corkboard';
import { useProvenanceStore, findOverlappingXinFlag } from '@/lib/store/provenance';
import researchDataJson from '@/content/seed/research-radiogenomics.json';
import { renderResearchBody } from '@/lib/research/sanitize';
import type { SearchResult } from '@/lib/zhihu/types';

// Server-proxy: hits `/api/zhihu/search?q=...` instead of the in-process
// adapter so the secret + mode flag stay server-side. Response shape:
// `{ results: SearchResult[], source: 'live' | 'mock' }`.
async function fetchZhihuSearch(q: string): Promise<{ results: SearchResult[]; isLive: boolean }> {
  const res = await fetch(`/api/zhihu/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`search ${res.status}`);
  const data = (await res.json()) as { results: SearchResult[]; source?: string };
  return { results: data.results, isLive: data.source === 'live' };
}

type ResearchScope = 'quick' | 'deep' | 'thorough';

interface ResearchSource {
  kind: 'web' | 'vault' | 'zhihu';
  id: string;
  label: string;
  text: string;
  host: string;
  url?: string;
  articleId?: string;
}

interface ResearchSection {
  heading: string;
  body: string;
}

interface ResearchReport {
  title: string;
  query: string;
  scope: ResearchScope;
  outline: string[];
  sections: ResearchSection[];
  sources: ResearchSource[];
  tokenCount: number;
}

const researchData = researchDataJson as ResearchReport;

function truncateTitle(s: string, maxChars: number): string {
  if (!s) return '';
  return s.length <= maxChars ? s : s.slice(0, maxChars - 1) + '…';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface ResearchTabProps {
  selection?: { text: string; rect?: DOMRect } | null;
  // R2 judge fix (周源 / 吴伟 P1 2026-05-12): trend-origin signals that the
  // insert path must always re-confirm via 看心 审议. The session-ack flag
  // (`isTrendsAcknowledged`) bypasses the modal once accepted; trend-origin
  // inserts cannot use that bypass.
  origin?: 'trend' | 'manual';
  sourceUrl?: string;
}

const SCOPES: Array<{ id: ResearchScope; label: string }> = [
  { id: 'quick', label: '快查' },
  { id: 'deep', label: '深考' },
  { id: 'thorough', label: '尽考' },
];

function H({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="research-section-heading"
      style={{
        fontSize: 13, fontWeight: 600, color: '#1772F6',
        marginTop: 14, marginBottom: 4,
        fontFamily: '"Noto Serif SC", serif',
        letterSpacing: 0.5,
      }}
    >
      {children}
    </div>
  );
}

const scopeButtonStyle = (active: boolean): CSSProperties => ({
  padding: '3px 10px', fontSize: 11, borderRadius: 3,
  border: `1px solid ${active ? '#1772F6' : 'rgba(23,114,246,0.25)'}`,
  background: active ? '#1772F6' : 'transparent',
  color: active ? '#fff' : '#1A1F2A',
  cursor: 'pointer', fontFamily: '"Noto Sans SC", sans-serif',
});

export function ResearchTab({ selection, origin = 'manual', sourceUrl }: ResearchTabProps) {
  const [scope, setScope] = useState<ResearchScope>(researchData.scope);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [xinGateOpen, setXinGateOpen] = useState(false);
  const [liveHits, setLiveHits] = useState<SearchResult[] | null>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'live' | 'fallback'>('idle');
  // Detailed progress tracking so the user can SEE what 看水 actually did,
  // not just a vague "loading" spinner. Captured for both in-flight and
  // completed states; the panel below renders both.
  const [searchInfo, setSearchInfo] = useState<{
    query: string;
    startedAt: number;
    finishedAt?: number;
    error?: string;
  } | null>(null);
  // Manual-query input: when the panel opens without a selection, the user
  // can type a query directly here. Drives the same fetch path as selection-
  // initiated lookups.
  const [manualQuery, setManualQuery] = useState('');
  const [manualSubmittedQuery, setManualSubmittedQuery] = useState<string | null>(null);
  const didFetchRef = useRef<string | null>(null);
  const effectiveQuery = selection?.text || manualSubmittedQuery || '';
  const queryText = effectiveQuery || researchData.query;
  const isFromTrend = origin === 'trend';

  const runSearch = useCallback((query: string) => {
    if (didFetchRef.current === query) return;
    didFetchRef.current = query;
    setSearchStatus('loading');
    setSearchInfo({ query, startedAt: Date.now() });
    fetchZhihuSearch(query)
      .then(({ results, isLive }) => {
        setSearchInfo((prev) => prev ? { ...prev, finishedAt: Date.now() } : prev);
        if (results.length === 0) {
          setSearchStatus('fallback');
          setLiveHits(null);
          return;
        }
        setLiveHits(results.slice(0, 8));
        // Only claim LIVE when the server reported `source: 'live'` — mock-mode
        // returns the same fixture and would otherwise display LIVE misleadingly.
        setSearchStatus(isLive ? 'live' : 'fallback');
      })
      .catch((err: Error) => {
        setSearchInfo((prev) => prev ? { ...prev, finishedAt: Date.now(), error: err.message } : prev);
        setSearchStatus('fallback');
        setLiveHits(null);
      });
  }, []);

  useEffect(() => {
    if (!selection?.text) return;
    runSearch(selection.text);
  }, [selection?.text, runSearch]);
  useEffect(() => {
    if (!manualSubmittedQuery) return;
    runSearch(manualSubmittedQuery);
  }, [manualSubmittedQuery, runSearch]);

  // When live hits are available, derive outline + sections + sources from
  // them; otherwise keep the fixture so the demo never shows an empty panel.
  const liveOutline = liveHits ? liveHits.slice(0, 5).map((h) => truncateTitle(h.title, 18)) : null;
  const liveSections = liveHits
    ? liveHits.slice(0, 4).map((h, i) => ({
        heading: truncateTitle(h.title, 32),
        body: `<p>${escapeHtml(h.abstract ?? '').slice(0, 220)}<sup data-cite-id="live-${i}">[${i + 1}]</sup></p>`,
      }))
    : null;
  const liveSources = liveHits
    ? liveHits.map((h, i) => ({
        kind: 'zhihu' as const,
        id: `live-${i}`,
        label: h.author?.displayName ? `@${h.author.displayName}` : `知乎 · ${h.type}`,
        text: h.title,
        host: 'zhihu.com',
        url: h.url,
        articleId: h.id,
      }))
    : null;

  const renderedSections = liveSections ?? researchData.sections;
  const renderedSources = liveSources ?? researchData.sources;
  const renderedOutline = liveOutline ?? researchData.outline;
  const renderedTitle = liveHits ? `「${queryText}」 — 知乎 实时搜索 ${liveHits.length} 条` : researchData.title;
  const sourceCount = renderedSources.length;

  const handleBodyClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const sup = target.closest('sup[data-cite-id]');
    if (!sup) return;
    const id = sup.getAttribute('data-cite-id');
    const source = renderedSources.find((s) => s.id === id);
    if (source?.url) {
      window.open(source.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (source) console.log('[research-cite]', source);
  };

  const performInsert = () => {
    const editor = useEditorStore.getState().editor;
    if (!editor) return;
    // R3 fix (吴伟 P1): when we have live search results, insert a concise
    // summary derived from them, NOT the radiogenomics fixture sections. For
    // trend-origin inserts this guarantees the inserted payload is actually
    // about the trend the user clicked.
    if (liveHits && liveHits.length > 0) {
      const intro = `<p><strong>${escapeHtml(queryText)}</strong> — 看水 实时考据 ${liveHits.length} 条来源:</p>`;
      const bullets = liveHits.slice(0, 4).map((h, i) => {
        const snippet = (h.abstract ?? h.title).slice(0, 140);
        return `<p>· ${escapeHtml(snippet)}<sup data-cite-id="live-${i}">[${i + 1}]</sup></p>`;
      }).join('\n');
      editor.chain().focus().insertContent(intro + bullets).run();
      // R3 cross-fox edge #2 (李笛 P0): record 看水 sourced provenance, linking
      // back to any prior 看心 flag on the same excerpt so MarginSealPopover
      // can render "看水 已补出处" beneath the 看心 chit. Closes the loop.
      const add = useProvenanceStore.getState().add;
      for (const h of liveHits.slice(0, 4)) {
        const excerpt = (h.abstract ?? h.title).slice(0, 80);
        const relatedTo = findOverlappingXinFlag(excerpt);
        add({
          kind: 'sourced',
          fox: 'shui',
          excerpt,
          relatedTo,
          relatedAction: relatedTo ? 'sourced-after-flag' : undefined,
        });
      }
      return;
    }
    // Manual-origin / fallback path: existing fixture insert.
    const html = renderedSections.map((s) => `<h3>${s.heading}</h3>${s.body}`).join('\n');
    editor.chain().focus().insertContent(html).run();
  };

  const handleInsert = () => {
    // R2 judge fix (周源 / 吴伟 P1 2026-05-12): trend-origin research must
    // always pass through the 看心 审议 gate per insert; the session-ack
    // bypass is bypassable-once-and-done, which weakens the 清朗 第二阶段
    // commitment to "热榜不直接扩写正文".
    if (isFromTrend) {
      setXinGateOpen(true);
      return;
    }
    if (isTrendsAcknowledged()) {
      performInsert();
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmInsert = () => {
    markTrendsAcknowledged();
    setConfirmOpen(false);
    performInsert();
  };

  const handleCancelInsert = () => {
    setConfirmOpen(false);
  };

  const handleXinGateConfirm = () => {
    // Record a 看心 hedge entry so the cross-fox provenance chain (see
    // MarginSealPopover + VoiceDiffPanel) has the trend-derived material on
    // record as "经看心审议过的引入".
    useProvenanceStore.getState().add({
      kind: 'hedge',
      fox: 'xin',
      excerpt: queryText.slice(0, 80),
    });
    setXinGateOpen(false);
    performInsert();
  };

  const handleXinGateCancel = () => {
    setXinGateOpen(false);
  };

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: '#FAFBFD',
      fontFamily: '"Noto Serif SC", serif',
      color: '#1A1F2A',
      overflow: 'hidden',
    }}>
      {/* Scope selector + status */}
      <div style={{
        flexShrink: 0,
        padding: '8px 14px',
        borderBottom: '1px solid rgba(23,114,246,0.18)',
        background: '#F4F7FB',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 10, color: '#7A8B9F', letterSpacing: 0.5,
          fontFamily: 'JetBrains Mono, monospace' }}>SCOPE</span>
        {SCOPES.map((s) => (
          <button
            key={s.id}
            data-testid={`research-scope-${s.id}`}
            data-active={scope === s.id}
            onClick={() => setScope(s.id)}
            style={scopeButtonStyle(scope === s.id)}
          >
            {s.label}
          </button>
        ))}
        <div style={{ flex: 1 }}/>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 10, color: '#1772F6',
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.4,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 3, background: '#1772F6',
            animation: 'pulse 1.4s ease-in-out infinite',
          }}/>
          已就位
        </span>
      </div>

      {/* Manual query input — visible when there's no selection AND no
          search has been run yet. Gives the user a way to invoke 看水 from
          the daily-icon (no editor selection required). */}
      {!selection?.text && !searchInfo && (
        <ManualQueryInput
          value={manualQuery}
          onChange={setManualQuery}
          onSubmit={() => {
            const q = manualQuery.trim();
            if (q.length >= 2) setManualSubmittedQuery(q);
          }}
        />
      )}

      {/* Progress / process panel. Visible while loading AND after completion
          so the user can see what 看水 actually did (query, source, count,
          duration). Replaces the previous single-line spinner that was easy
          to miss. */}
      {searchInfo && (
        <ResearchProgressPanel
          info={searchInfo}
          status={searchStatus}
          hits={liveHits}
          onRerun={() => {
            didFetchRef.current = null;
            setLiveHits(null);
            setSearchStatus('idle');
            setSearchInfo(null);
          }}
        />
      )}

      {/* R2 judge fix (周源 / 吴伟 P1 2026-05-12): trend-origin banner. Makes
          the 清朗 第二阶段 commitment visible at the surface where it's most
          likely to be tested — when 答主 clicks a 热榜 row. */}
      {isFromTrend && (
        <div
          data-testid="research-trend-origin-banner"
          style={{
            flexShrink: 0,
            padding: '8px 14px',
            background: '#FFF8EC',
            borderBottom: '1px solid rgba(168,123,42,0.45)',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            fontSize: 11,
            color: '#5A4A1F',
            fontFamily: '"Noto Sans SC", sans-serif',
            lineHeight: 1.5,
          }}
        >
          <span style={{ fontSize: 14 }} aria-hidden>⚠</span>
          <span style={{ flex: 1 }}>
            由 看势 进入 · 看心 须先审议是否含医学 / 投资 / 事实声明 — 插入正文需逐次确认
          </span>
          {sourceUrl && (
            <a
              data-testid="research-trend-source-link"
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 10,
                padding: '2px 8px',
                border: '1px solid rgba(168,123,42,0.55)',
                borderRadius: 2,
                color: '#5A4A1F',
                fontFamily: '"Noto Serif SC", serif',
                textDecoration: 'none',
              }}
            >
              → 原帖
            </a>
          )}
        </div>
      )}

      {/* Title + query */}
      <div style={{
        flexShrink: 0,
        padding: '12px 16px 8px',
        borderBottom: '1px solid rgba(23,114,246,0.10)',
      }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: '#1A1F2A',
          fontFamily: '"Noto Serif SC", serif', lineHeight: 1.4 }}>
          {renderedTitle}
        </div>
        <div
          data-testid="research-query"
          style={{ fontSize: 10, color: '#7A8B9F', marginTop: 6,
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.4 }}
        >
          看水 · 灵感激发 → 深度考据 · 「{queryText}」 · {sourceCount} sources · {searchStatus === 'loading'
            ? <span data-testid="research-live-loading" style={{ color: '#1772F6' }}>实时检索中…</span>
            : searchStatus === 'live'
              ? <span data-testid="research-live-badge" style={{ color: '#1F8B66' }}>LIVE</span>
              : searchStatus === 'fallback'
                ? <span data-testid="research-fixture-badge" style={{ color: '#A87B2A' }}>fixture · 兜底</span>
                : `${(researchData.tokenCount / 1000).toFixed(1)}k tok`}
        </div>
      </div>

      {/* Outline chips */}
      <div style={{
        flexShrink: 0,
        padding: '8px 16px',
        borderBottom: '1px solid rgba(23,114,246,0.10)',
        display: 'flex', gap: 6, flexWrap: 'wrap',
      }}>
        {renderedOutline.map((c, i) => (
          <span
            key={i}
            data-testid="research-outline-chip"
            style={{
              fontSize: 10.5, padding: '2px 8px', borderRadius: 12,
              background: '#E8F1FE', color: '#1772F6',
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
          >
            {c}
          </span>
        ))}
      </div>

      {/* Report body */}
      <div
        onClick={handleBodyClick}
        style={{
          flex: 1, overflowY: 'auto',
          padding: '14px 18px',
          fontSize: 13, lineHeight: 1.85,
          fontFamily: '"Noto Serif SC", serif',
        }}
      >
        {renderedSections.map((section, i) => (
          <div key={i}>
            <H>{section.heading}</H>
            <div>{renderResearchBody(section.body)}</div>
          </div>
        ))}
      </div>

      {/* Sources rail */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid rgba(23,114,246,0.18)',
        background: '#F4F7FB',
        padding: '8px 14px',
        maxHeight: 130, overflowY: 'auto',
      }}>
        <div style={{ fontSize: 9.5, color: '#7A8B9F', letterSpacing: 0.6,
          fontFamily: 'JetBrains Mono, monospace', marginBottom: 6 }}>
          SOURCES · 三种 出处 · 全部可点
        </div>
        {renderedSources.map((s) => (
          <SourceRow
            key={s.id}
            source={s}
            onClick={() => {
              if (s.url) window.open(s.url, '_blank', 'noopener,noreferrer');
              else console.log('[research-source]', s);
            }}
            onPin={() => {
              useCorkboardStore.getState().addPin({
                kind: 'research',
                sourceId: s.id,
                content: { title: s.text, snippet: s.host, url: s.url },
                createdBy: 'user',
                w: 180,
                h: 130,
              });
            }}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{
        flexShrink: 0,
        padding: '8px 14px',
        borderTop: '1px solid rgba(23,114,246,0.18)',
        background: '#F4F7FB',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button
          data-testid="research-followup"
          onClick={() => console.log('[research] 追加查证')}
          style={{
            fontSize: 11, padding: '5px 10px', borderRadius: 3,
            border: '1px solid rgba(23,114,246,0.25)',
            background: 'transparent', color: '#1A1F2A',
            cursor: 'pointer', fontFamily: '"Noto Sans SC", sans-serif',
          }}
        >追加查证</button>
        <button
          data-testid="research-export"
          onClick={() => console.log('[research] 导出 .md')}
          style={{
            fontSize: 11, padding: '5px 10px', borderRadius: 3,
            border: '1px solid rgba(0,106,78,0.25)',
            background: 'transparent', color: '#1A1815',
            cursor: 'pointer', fontFamily: '"Noto Sans SC", sans-serif',
          }}
        >导出 .md</button>
        <div style={{ flex: 1 }}/>
        <button
          data-testid="research-insert"
          onClick={handleInsert}
          style={{
            fontSize: 11, padding: '5px 14px', borderRadius: 3,
            border: 'none',
            background: isFromTrend ? '#A87B2A' : '#1772F6',
            color: '#fff',
            cursor: 'pointer', fontFamily: '"Noto Sans SC", sans-serif',
            fontWeight: 500,
          }}
        >
          {isFromTrend ? '经看心审议后插入 ↵' : '插入正文 ↵'}
        </button>
      </div>
      <ComplianceLine>引用全部实时检索 · 不入训练集</ComplianceLine>

      <TrendsConfirmModal
        open={confirmOpen}
        onConfirm={handleConfirmInsert}
        onCancel={handleCancelInsert}
      />

      {/* R2 judge fix (周源 / 吴伟 P1 2026-05-12): per-insert 看心审议 gate for
          trend-origin research. Always fires; not bypassable by session-ack. */}
      {xinGateOpen && (
        <div
          data-testid="research-xin-gate-modal"
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 4000,
          }}
        >
          <div
            style={{
              background: '#FAF8F3',
              border: '1px solid rgba(168,123,42,0.55)',
              borderRadius: 6,
              padding: '18px 20px',
              width: 400,
              fontFamily: '"Noto Serif SC", serif',
              color: '#1A1F2A',
              boxShadow: '0 12px 32px rgba(20,22,30,0.32)',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#5A4A1F' }}>
              看心 · 审议
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.65, marginBottom: 14, color: '#3A2E20' }}>
              这条考据来自 看势 热榜。看心 需先确认它不含以下风险，方可插入正文：
              <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                <li>未经核证的医学 / 投资 / 法律绝对化判断</li>
                <li>未注明出处的事实声明</li>
                <li>属于 清朗 第二阶段 红线的「热榜直接扩写」</li>
              </ul>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                data-testid="research-xin-gate-cancel"
                onClick={handleXinGateCancel}
                style={{
                  padding: '6px 12px',
                  fontSize: 11,
                  background: 'transparent',
                  color: '#7A6F5A',
                  border: '1px solid rgba(168,155,126,0.55)',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontFamily: '"Noto Serif SC", serif',
                }}
              >
                返回检查
              </button>
              <button
                type="button"
                data-testid="research-xin-gate-confirm"
                onClick={handleXinGateConfirm}
                style={{
                  padding: '6px 14px',
                  fontSize: 11,
                  background: '#A87B2A',
                  color: '#FAF8F3',
                  border: '1px solid #8A5F1E',
                  borderRadius: 2,
                  cursor: 'pointer',
                  fontFamily: '"Noto Serif SC", serif',
                }}
              >
                我已确认无医学/投资/法律绝对化判断 · 插入正文
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Visible 看水 工作面板 — drives the "what is it doing / what did it fetch"
// question the user repeatedly asked. Always visible after a search has
// started; transitions from in-flight (animated dots + step list) → done
// (timing + breakdown card). Click "重新检索" to reset.
function ResearchProgressPanel({
  info,
  status,
  hits,
  onRerun,
}: {
  info: { query: string; startedAt: number; finishedAt?: number; error?: string };
  status: 'idle' | 'loading' | 'live' | 'fallback';
  hits: SearchResult[] | null;
  onRerun: () => void;
}) {
  const isLoading = status === 'loading';
  const isLive = status === 'live';
  const isFallback = status === 'fallback';
  const elapsed = info.finishedAt ? info.finishedAt - info.startedAt : Date.now() - info.startedAt;
  // Step definitions — fixed labels, dynamic state. The actual upstream call
  // is one round-trip but conceptually does these four things.
  const steps: { id: string; label: string; detail: string; done: boolean; active: boolean }[] = [
    {
      id: 'plan',
      label: '准备检索词',
      detail: `「${info.query.slice(0, 60)}${info.query.length > 60 ? '…' : ''}」`,
      done: true,
      active: false,
    },
    {
      id: 'call',
      label: '调用知乎搜索',
      detail: 'GET /api/v1/content/zhihu_search',
      done: !!info.finishedAt,
      active: isLoading,
    },
    {
      id: 'extract',
      label: '提取摘要 + 作者',
      detail: hits ? `${hits.length} 条来源` : '等待响应',
      done: !!hits,
      active: !!info.finishedAt && !hits && !info.error,
    },
    {
      id: 'attach',
      label: '挂可溯出处',
      detail: hits ? `每条挂 [n] 上标，点击跳转原帖` : '等待要点',
      done: !!hits && !!info.finishedAt,
      active: false,
    },
  ];

  const withSummary = hits ? hits.filter((h) => (h.abstract ?? '').length > 0).length : 0;
  const withAuthor = hits ? hits.filter((h) => h.author?.displayName).length : 0;

  return (
    <div
      data-testid="research-progress-panel"
      style={{
        flexShrink: 0,
        padding: '12px 14px',
        background: isLoading
          ? 'linear-gradient(90deg, rgba(23,114,246,0.10) 0%, rgba(23,114,246,0.02) 100%)'
          : isLive
            ? 'linear-gradient(90deg, rgba(31,139,102,0.08) 0%, rgba(31,139,102,0.01) 100%)'
            : '#FFF8EC',
        borderBottom: `1px solid ${isLoading ? 'rgba(23,114,246,0.25)' : isLive ? 'rgba(31,139,102,0.30)' : 'rgba(168,123,42,0.40)'}`,
        fontFamily: '"Noto Sans SC", sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span
          aria-hidden
          style={{
            width: 8, height: 8, borderRadius: 4,
            background: isLoading ? '#1772F6' : isLive ? '#1F8B66' : '#A87B2A',
            animation: isLoading ? 'pulse 1.2s ease-in-out infinite' : undefined,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 12, fontWeight: 600, color: isLoading ? '#1A4480' : isLive ? '#0E4D38' : '#5A4A1F' }}>
          {isLoading ? '看水 正在工作' : isLive ? `看水 查完了 · ${(elapsed / 1000).toFixed(1)}s · ${hits?.length ?? 0} 条来源` : '看水 走兜底数据 (不是实时知乎)'}
        </span>
        <div style={{ flex: 1 }} />
        {info.finishedAt && (
          <button
            type="button"
            onClick={onRerun}
            data-testid="research-rerun"
            style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 2,
              border: '1px solid rgba(0,0,0,0.15)', background: 'rgba(255,255,255,0.6)',
              color: '#3A4452', cursor: 'pointer',
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
          >
            重新检索
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {steps.map((s) => (
          <div
            key={s.id}
            data-testid={`research-step-${s.id}`}
            data-state={s.done ? 'done' : s.active ? 'active' : 'pending'}
            style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 11 }}
          >
            <span
              aria-hidden
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 14, height: 14,
                fontSize: 9.5,
                color: s.done ? '#1F8B66' : s.active ? '#1772F6' : 'rgba(0,0,0,0.30)',
                flexShrink: 0,
              }}
            >
              {s.done ? '✓' : s.active ? '◐' : '○'}
            </span>
            <span style={{
              fontWeight: s.active ? 600 : 500,
              color: s.done ? '#0E4D38' : s.active ? '#1A4480' : '#5A6B85',
              minWidth: 110,
            }}>
              {s.label}
            </span>
            <span style={{ color: '#5A6B85', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
              {s.detail}
            </span>
          </div>
        ))}
      </div>

      {hits && hits.length > 0 && (
        <div
          data-testid="research-fetch-summary"
          style={{
            marginTop: 10, paddingTop: 8,
            borderTop: '1px dashed rgba(0,0,0,0.10)',
            fontSize: 10.5, color: '#3A4452', lineHeight: 1.65,
          }}
        >
          <div style={{ marginBottom: 2, fontWeight: 600, color: '#1A1F2A' }}>拉到了什么：</div>
          <div>· {hits.length} 条来源，全部来自 zhihu.com</div>
          <div>· {withSummary} 条带摘要 · {withAuthor} 条带作者署名</div>
          <div>· 全部可点击溯源：正文里的 [1][2][3] 上标 → 原帖</div>
        </div>
      )}
      {isFallback && hits === null && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed rgba(168,123,42,0.30)', fontSize: 10.5, color: '#5A4A1F', lineHeight: 1.65 }}>
          {info.error
            ? `失败原因：${info.error}`
            : '知乎搜索没返回结果，已切换到本地兜底数据（不可点击溯源）。'}
        </div>
      )}
    </div>
  );
}

function ManualQueryInput({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  return (
    <div
      style={{
        flexShrink: 0,
        padding: '10px 14px',
        background: '#F4F7FB',
        borderBottom: '1px solid rgba(23,114,246,0.18)',
        fontFamily: '"Noto Sans SC", sans-serif',
      }}
    >
      <div style={{ fontSize: 10.5, color: '#5A6B85', marginBottom: 6 }}>
        没选中段落？直接输入要查的话题 — 看水会现查知乎全网
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
        <input
          data-testid="research-manual-query"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim().length >= 2) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="比如：影像组学外部验证 / AI 写作工具语风 / 量化交易回测"
          style={{
            flex: 1,
            padding: '6px 10px',
            border: '1px solid rgba(23,114,246,0.20)',
            background: '#fff',
            borderRadius: 3,
            fontSize: 12,
            fontFamily: '"Noto Sans SC", sans-serif',
            color: '#1A1F2A',
            outline: 'none',
          }}
        />
        <button
          type="button"
          data-testid="research-manual-submit"
          onClick={onSubmit}
          disabled={value.trim().length < 2}
          style={{
            padding: '0 14px',
            border: 'none',
            borderRadius: 3,
            background: value.trim().length < 2 ? '#D1CDB7' : '#1772F6',
            color: '#fff',
            fontSize: 11,
            cursor: value.trim().length < 2 ? 'not-allowed' : 'pointer',
            fontFamily: '"Noto Sans SC", sans-serif',
          }}
        >
          让看水查
        </button>
      </div>
    </div>
  );
}
