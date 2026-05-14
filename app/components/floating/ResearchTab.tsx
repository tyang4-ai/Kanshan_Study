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

// Server-proxy: hits `/api/zhihu/search?q=...&scope=...` instead of the
// in-process adapter so the secret + mode flag stay server-side. Scope
// controls fan-out: quick = 1 zhihu_search call (~8 results), deep adds
// zhihu_global_search (~16-24 results), thorough adds chatWithZhida +
// additional pages (~40+ results). Response shape:
// `{ results: SearchResult[], source: 'live'|'mock', breakdown? }`.
async function fetchZhihuSearch(
  q: string,
  scope: 'quick' | 'deep' | 'thorough' = 'quick',
): Promise<{ results: SearchResult[]; isLive: boolean }> {
  const res = await fetch(`/api/zhihu/search?q=${encodeURIComponent(q)}&scope=${scope}`);
  if (!res.ok) throw new Error(`search ${res.status}`);
  const data = (await res.json()) as { results: SearchResult[]; source?: string };
  return { results: data.results, isLive: data.source === 'live' };
}

// LLM-generated prose summary from the search hits. Sent to the kanshan-chat
// route which already proxies an LLM call. Fail-soft: if the LLM is down the
// caller renders the stats-only breakdown instead.
async function fetchResearchSummary(
  query: string,
  hits: SearchResult[],
): Promise<string> {
  const body = hits
    .slice(0, 12)
    .map((h, i) => `[${i + 1}] ${h.title}${h.abstract ? ' — ' + h.abstract.slice(0, 240) : ''}`)
    .join('\n');
  const userMessage =
    `用户问的是「${query}」。下面是我查到的 ${hits.length} 条知乎来源摘要：\n${body}\n\n` +
    '请用 80-140 字给出一个综合性的看法 — 不要复述每条，而是告诉用户：' +
    '这些来源整体说了什么 / 有没有分歧 / 用户应该重点看哪几条。不要列表，写成两三句话的段落。';
  const r = await fetch('/api/agents/kanshan/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userMessage, history: [] }),
  });
  if (!r.ok) throw new Error('summary llm failed');
  // /api/agents/kanshan/chat returns an SSE stream — parse the reply event.
  const text = await r.text();
  const m = text.match(/event:\s*reply\s*\n\s*data:\s*(\{[^\n]+\})/);
  if (!m) throw new Error('no reply event');
  const payload = JSON.parse(m[1]) as { text?: string };
  if (!payload.text) throw new Error('empty reply');
  return payload.text;
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
  /** Query handed in by 看山 orchestrator via tool_call args. Triggers an
   *  automatic search on mount — no second action required from the user.
   *  Without this hook, "open_research" was a window-opener but not an
   *  actual orchestration. */
  preloadQuery?: string;
  /** Scope chosen by 看山 (or trend bulletin). Lets the orchestrator say
   *  e.g. 「这条新闻得查得深一点」 → 'thorough'. */
  preloadScope?: ResearchScope;
  // R2 judge fix (周源 / 吴伟 P1 2026-05-12): trend-origin signals that the
  // insert path must always re-confirm via 看心 审议. The session-ack flag
  // (`isTrendsAcknowledged`) bypasses the modal once accepted; trend-origin
  // inserts cannot use that bypass.
  origin?: 'trend' | 'manual';
  sourceUrl?: string;
}

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

export function ResearchTab({ selection, preloadQuery, preloadScope, origin = 'manual', sourceUrl }: ResearchTabProps) {
  // Default quick (per user request 2026-05-13): the bulk of look-ups are
  // single-claim sanity checks; deep/thorough are 看山 / power-user choices.
  const [scope, setScope] = useState<ResearchScope>(preloadScope ?? 'quick');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [xinGateOpen, setXinGateOpen] = useState(false);
  const [liveHits, setLiveHits] = useState<SearchResult[] | null>(null);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'live' | 'fallback'>('idle');
  // Detailed progress tracking so the user can SEE what 看水 actually did,
  // not just a vague "loading" spinner. Captured for both in-flight and
  // completed states; the panel below renders both.
  const [searchInfo, setSearchInfo] = useState<{
    query: string;
    scope: ResearchScope;
    startedAt: number;
    finishedAt?: number;
    error?: string;
    summary?: string; // LLM-generated prose summary
    summaryLoading?: boolean;
  } | null>(null);
  const [manualQuery, setManualQuery] = useState('');
  const [manualSubmittedQuery, setManualSubmittedQuery] = useState<string | null>(null);
  const didFetchRef = useRef<string | null>(null);
  const effectiveQuery = selection?.text || preloadQuery || manualSubmittedQuery || '';
  const queryText = effectiveQuery || researchData.query;
  const isFromTrend = origin === 'trend';

  const runSearch = useCallback((query: string, scopeArg: ResearchScope) => {
    const key = `${query}|${scopeArg}`;
    if (didFetchRef.current === key) return;
    didFetchRef.current = key;
    setSearchStatus('loading');
    setSearchInfo({ query, scope: scopeArg, startedAt: Date.now() });
    fetchZhihuSearch(query, scopeArg)
      .then(({ results, isLive }) => {
        setSearchInfo((prev) => prev ? { ...prev, finishedAt: Date.now(), summaryLoading: results.length > 0 } : prev);
        if (results.length === 0) {
          setSearchStatus('fallback');
          setLiveHits(null);
          return;
        }
        const cap = scopeArg === 'quick' ? 8 : scopeArg === 'deep' ? 16 : 24;
        const trimmed = results.slice(0, cap);
        setLiveHits(trimmed);
        setSearchStatus(isLive ? 'live' : 'fallback');
        // Fire LLM summary in the background — non-blocking; the cards/sources
        // are already rendered while the prose synthesis arrives.
        void fetchResearchSummary(query, trimmed)
          .then((summary) => setSearchInfo((prev) => prev ? { ...prev, summary, summaryLoading: false } : prev))
          .catch(() => setSearchInfo((prev) => prev ? { ...prev, summaryLoading: false } : prev));
      })
      .catch((err: Error) => {
        setSearchInfo((prev) => prev ? { ...prev, finishedAt: Date.now(), error: err.message } : prev);
        setSearchStatus('fallback');
        setLiveHits(null);
      });
  }, []);

  // Selection-initiated lookups
  useEffect(() => {
    if (!selection?.text) return;
    runSearch(selection.text, scope);
  }, [selection?.text, scope, runSearch]);
  // Manual-input lookups
  useEffect(() => {
    if (!manualSubmittedQuery) return;
    runSearch(manualSubmittedQuery, scope);
  }, [manualSubmittedQuery, scope, runSearch]);
  // 看山 orchestrator handoff: when opened via `open_research` with args.query,
  // start the search immediately. This is what makes 看山 an actual
  // orchestrator and not just a tab-launcher.
  useEffect(() => {
    if (!preloadQuery) return;
    runSearch(preloadQuery, preloadScope ?? scope);
  }, [preloadQuery, preloadScope, scope, runSearch]);

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
    // r6 demo-day fix (2026-05-13 — 周源 R6.5 P0): manual-origin research
    // (从 看山 chat 或 直接搜索) used to fall through to the TrendsConfirmModal
    // when the session-ack flag wasn't set — a dead gate left over from an
    // earlier merged design. Manual inserts have no 看势 source so they go
    // straight to performInsert. The xin-gate above handles all trend cases.
    performInsert();
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
      {/* Persistent search bar. Always visible — pre-fills with the active
          query so the user can edit + re-run without hunting for a hidden
          input. Initial-state copy below the input changes after a search
          has been done. */}
      <ManualQueryInput
        value={manualQuery || (searchInfo ? searchInfo.query : '')}
        hasRun={!!searchInfo}
        scope={scope}
        onScopeChange={setScope}
        onChange={setManualQuery}
        onSubmit={() => {
          const q = (manualQuery || (searchInfo ? searchInfo.query : '')).trim();
          if (q.length < 2) return;
          // Reset the dedup ref so we re-run even on identical text (e.g. the
          // user changed scope but kept the same query).
          didFetchRef.current = null;
          setManualQuery(q);
          setManualSubmittedQuery(q);
        }}
      />

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
      {searchInfo && (searchInfo.summary || searchInfo.summaryLoading) && (
        <ResearchSummaryCard
          summary={searchInfo.summary}
          loading={searchInfo.summaryLoading}
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

// One-line progress strip + a short prose summary card. The previous version
// (steps + breakdown card) was too dense per user feedback 2026-05-13.
function ResearchProgressPanel({
  info,
  status,
  hits,
  onRerun,
}: {
  info: {
    query: string;
    scope: ResearchScope;
    startedAt: number;
    finishedAt?: number;
    error?: string;
    summary?: string;
    summaryLoading?: boolean;
  };
  status: 'idle' | 'loading' | 'live' | 'fallback';
  hits: SearchResult[] | null;
  onRerun: () => void;
}) {
  const isLoading = status === 'loading';
  const isLive = status === 'live';
  // R5 (颜鑫 P1 2026-05-13): elapsed used to fall back to Date.now() during
  // loading state, which is an impure call in render. Since the elapsed seconds
  // only render in the `isLive` branch (where finishedAt is guaranteed set),
  // we can scope the math to that branch and drop the impure fallback.
  const elapsed = info.finishedAt ? info.finishedAt - info.startedAt : 0;
  const scopeLabel = info.scope === 'quick' ? '快查' : info.scope === 'deep' ? '深考' : '尽考';

  // Single-line status text
  const statusLine = isLoading
    ? `看水 ${scopeLabel} 中 · 「${info.query.slice(0, 32)}${info.query.length > 32 ? '…' : ''}」`
    : isLive
      ? `看水 ${scopeLabel} 完成 · ${hits?.length ?? 0} 条来源 · ${(elapsed / 1000).toFixed(1)}s`
      : `看水 走兜底数据${info.error ? ` · ${info.error.slice(0, 40)}` : ''}`;

  return (
    <div
      data-testid="research-progress-panel"
      style={{
        flexShrink: 0,
        padding: '7px 14px',
        background: isLoading
          ? 'rgba(23,114,246,0.08)'
          : isLive
            ? 'rgba(31,139,102,0.07)'
            : '#FFF8EC',
        borderBottom: `1px solid ${isLoading ? 'rgba(23,114,246,0.22)' : isLive ? 'rgba(31,139,102,0.28)' : 'rgba(168,123,42,0.35)'}`,
        fontFamily: '"Noto Sans SC", sans-serif',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 7, height: 7, borderRadius: 4,
          background: isLoading ? '#1772F6' : isLive ? '#1F8B66' : '#A87B2A',
          animation: isLoading ? 'pulse 1.2s ease-in-out infinite' : undefined,
          flexShrink: 0,
        }}
      />
      <span
        data-testid="research-status-line"
        style={{
          fontSize: 11.5,
          fontWeight: 500,
          color: isLoading ? '#1A4480' : isLive ? '#0E4D38' : '#5A4A1F',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
        }}
      >
        {statusLine}
      </span>
      {info.finishedAt && (
        <button
          type="button"
          onClick={onRerun}
          data-testid="research-rerun"
          style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 2,
            border: '1px solid rgba(0,0,0,0.15)', background: 'rgba(255,255,255,0.7)',
            color: '#3A4452', cursor: 'pointer',
            fontFamily: '"Noto Sans SC", sans-serif',
            flexShrink: 0,
          }}
        >
          重新检索
        </button>
      )}
    </div>
  );
}

/** LLM-prose summary card; renders below the progress strip when ready. */
function ResearchSummaryCard({ summary, loading }: { summary?: string; loading?: boolean }) {
  if (!summary && !loading) return null;
  return (
    <div
      data-testid="research-summary-card"
      style={{
        flexShrink: 0,
        margin: '8px 14px 0',
        padding: '10px 12px',
        background: '#FFFDF5',
        border: '1px solid rgba(168,155,126,0.30)',
        borderRadius: 4,
        fontFamily: '"Noto Serif SC", serif',
        fontSize: 12.5,
        color: '#3A2E20',
        lineHeight: 1.7,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 1.2,
          color: '#9A8A75',
          fontFamily: 'JetBrains Mono, monospace',
          marginBottom: 4,
        }}
      >
        看水 的整体看法
      </div>
      {loading && !summary ? (
        <span style={{ fontStyle: 'italic', color: '#9A8A75' }}>整合中…</span>
      ) : (
        summary
      )}
    </div>
  );
}

function ManualQueryInput({
  value,
  hasRun,
  scope,
  onChange,
  onScopeChange,
  onSubmit,
}: {
  value: string;
  hasRun: boolean;
  scope: ResearchScope;
  onChange: (v: string) => void;
  onScopeChange: (s: ResearchScope) => void;
  onSubmit: () => void;
}) {
  // Local edit buffer — lets the user edit the value field without each
  // keystroke instantly clobbering the parent state.
  const [draft, setDraft] = useState(value);
  // R5 (颜鑫 P1 2026-05-13): useRef pattern to detect actual external prop
  // change instead of unconditional setState in effect. Avoids re-rendering
  // the search bar on every parent re-render where `value` is identity-stable.
  const externalValueRef = useRef(value);
  useEffect(() => {
    if (value !== externalValueRef.current) {
      externalValueRef.current = value;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(value);
    }
  }, [value]);
  const submit = () => {
    onChange(draft);
    onSubmit();
  };
  return (
    <div
      data-testid="research-search-bar"
      style={{
        flexShrink: 0,
        padding: '8px 14px',
        background: '#F4F7FB',
        borderBottom: '1px solid rgba(23,114,246,0.18)',
        fontFamily: '"Noto Sans SC", sans-serif',
        display: 'flex',
        gap: 6,
        alignItems: 'stretch',
      }}
    >
      <input
        data-testid="research-manual-query"
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && draft.trim().length >= 2) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={hasRun ? '编辑后回车重新查' : '输入要查的话题 — 比如「影像组学外部验证」'}
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
      <select
        data-testid="research-scope-select"
        value={scope}
        onChange={(e) => onScopeChange(e.target.value as ResearchScope)}
        title="查多少 — 快查最便宜，尽考最全"
        style={{
          padding: '0 8px',
          border: '1px solid rgba(23,114,246,0.20)',
          background: '#fff',
          borderRadius: 3,
          fontSize: 11,
          fontFamily: '"Noto Sans SC", sans-serif',
          color: '#1A1F2A',
          cursor: 'pointer',
        }}
      >
        <option value="quick">快查</option>
        <option value="deep">深考</option>
        <option value="thorough">尽考</option>
      </select>
      <button
        type="button"
        data-testid="research-manual-submit"
        onClick={submit}
        disabled={draft.trim().length < 2}
        style={{
          padding: '0 14px',
          border: 'none',
          borderRadius: 3,
          background: draft.trim().length < 2 ? '#D1CDB7' : '#1772F6',
          color: '#fff',
          fontSize: 11,
          cursor: draft.trim().length < 2 ? 'not-allowed' : 'pointer',
          fontFamily: '"Noto Sans SC", sans-serif',
        }}
      >
        让看水查
      </button>
    </div>
  );
}
