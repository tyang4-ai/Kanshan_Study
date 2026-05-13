'use client';
import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ComplianceLine } from '@/components/compliance/ComplianceLine';
import { OverviewTab } from '@/components/stats/OverviewTab';
import { EngagementTab } from '@/components/stats/EngagementTab';
import { AudienceTab } from '@/components/stats/AudienceTab';
import { IncomeTab } from '@/components/stats/IncomeTab';
import { FOX_BY_ID } from '@/lib/foxes/registry';
import { useLastVisitStore } from '@/lib/store/last-visit';

type SubTabId = 'overview' | 'engagement' | 'audience' | 'income';

const SUB_TABS: { id: SubTabId; label: string }[] = [
  { id: 'overview', label: '总览' },
  { id: 'engagement', label: '阅读热度' },
  { id: 'audience', label: '读者画像' },
  { id: 'income', label: '收益' },
];

interface JingTurn {
  role: 'user' | 'jing';
  content: string;
}

export function StatsTab() {
  const [tab, setTab] = useState<SubTabId>('overview');
  const jing = FOX_BY_ID.jing;
  const sessionCount = useLastVisitStore((s) => s.sessionCount);
  const crossFoxEventCount = useLastVisitStore((s) => s.crossFoxEventCount);
  const trendOutboundClicks = useLastVisitStore((s) => s.trendOutboundClicks);
  const trackedDocsCount = useLastVisitStore((s) => s.lastVisits.length);

  // 看镜 chat state — live LLM-backed Q&A about the stats above.
  const [turns, setTurns] = useState<JingTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [composing, setComposing] = useState(false);
  const sendingRef = useRef(false);

  const send = async (): Promise<void> => {
    if (sendingRef.current) return;
    const text = draft.trim();
    if (!text) return;
    sendingRef.current = true;
    setStreaming(true);
    setDraft('');
    const next: JingTurn[] = [...turns, { role: 'user', content: text }];
    setTurns(next);
    try {
      const res = await fetch('/api/agents/jing/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: text,
          history: turns,
          context: { sessionCount, crossFoxEventCount, trendOutboundClicks, trackedDocsCount },
        }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      const reply = data.text ?? data.error ?? '看镜一时未通 — 请稍后重试。';
      setTurns((prev) => [...prev, { role: 'jing', content: reply }]);
    } catch {
      setTurns((prev) => [...prev, { role: 'jing', content: '网络中断 — 请稍后重试。' }]);
    } finally {
      setStreaming(false);
      sendingRef.current = false;
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (composing || e.nativeEvent.keyCode === 229) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const bubbleStyle = (role: 'user' | 'jing'): CSSProperties => ({
    alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
    maxWidth: '85%',
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 12.5,
    lineHeight: 1.6,
    fontFamily: '"Noto Serif SC", serif',
    background: role === 'user' ? '#2A2419' : '#FFFCF4',
    color: role === 'user' ? '#FAF8F3' : '#1A1F2A',
    border: role === 'jing' ? `1px solid ${jing.glow}55` : 'none',
    boxShadow: role === 'jing' ? `0 0 0 2px ${jing.glow}14` : 'none',
    whiteSpace: 'pre-wrap',
  });

  return (
    <div
      data-testid="stats-tab"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#FAFBFD',
        fontFamily: '"Noto Sans SC", -apple-system, sans-serif',
        color: '#1A1F2A',
        overflow: 'hidden',
      }}
    >
      {/* Tab strip */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          gap: 0,
          background: '#F0F3F8',
          borderBottom: '1px solid rgba(23,114,246,0.18)',
          padding: '0 12px',
        }}
      >
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            data-testid={`stats-subtab-${t.id}`}
            data-active={tab === t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 14px',
              border: 'none',
              background: 'transparent',
              color: tab === t.id ? jing.glow : '#5A6270',
              fontSize: 11.5,
              cursor: 'pointer',
              borderBottom: tab === t.id ? `2px solid ${jing.glow}` : '2px solid transparent',
              fontWeight: tab === t.id ? 600 : 400,
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
          >
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div
          style={{
            padding: '8px 0',
            fontSize: 10,
            color: '#7A8B9F',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: 0.5,
            alignSelf: 'center',
          }}
        >
          更新于 16:42 · MOCK
        </div>
      </div>

      <div
        data-testid="stats-engagement-row"
        style={{
          flexShrink: 0,
          padding: '8px 18px',
          background: '#F0F3F8',
          borderBottom: '1px solid rgba(23,114,246,0.14)',
          display: 'flex',
          gap: 18,
          flexWrap: 'wrap',
          fontSize: 10.5,
          color: '#3A4452',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: 0.4,
        }}
      >
        <span data-testid="stats-session-count">本会话 #{sessionCount}</span>
        <span aria-hidden style={{ opacity: 0.4 }}>·</span>
        <span data-testid="stats-tracked-docs">在写 {trackedDocsCount} 条线</span>
        <span aria-hidden style={{ opacity: 0.4 }}>·</span>
        <span data-testid="stats-cross-fox">狐狸间联动 {crossFoxEventCount} 次</span>
        <span aria-hidden style={{ opacity: 0.4 }}>·</span>
        <span data-testid="stats-trend-outbound">从看势导流到知乎 {trendOutboundClicks} 次</span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'engagement' && <EngagementTab />}
        {tab === 'audience' && <AudienceTab />}
        {tab === 'income' && <IncomeTab />}
      </div>

      {/* 看镜 chat — turns history (collapsed when empty) */}
      {turns.length > 0 && (
        <div
          data-testid="stats-chat-history"
          style={{
            flexShrink: 0,
            maxHeight: 220,
            overflowY: 'auto',
            padding: '10px 14px',
            background: '#F4F7FB',
            borderTop: '1px solid rgba(23,114,246,0.18)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {turns.map((t, i) => (
            <div key={i} data-testid={`stats-chat-bubble-${t.role}`} style={bubbleStyle(t.role)}>
              {t.content}
            </div>
          ))}
          {streaming && (
            <div data-testid="stats-chat-streaming" style={{ ...bubbleStyle('jing'), fontStyle: 'italic', opacity: 0.7 }}>
              看镜想想…
            </div>
          )}
        </div>
      )}

      {/* 看镜 chat input */}
      <div
        style={{
          flexShrink: 0,
          padding: '8px 14px',
          background: '#F4F7FB',
          borderTop: '1px solid rgba(23,114,246,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            background: jing.glow,
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: '"Noto Serif SC", serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {jing.initial}
        </div>
        <input
          data-testid="stats-chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onKeyDown={handleKey}
          disabled={streaming}
          placeholder="问看镜：本月互动为何下降？是某一篇的问题吗？"
          style={{
            flex: 1,
            border: '1px solid rgba(23,114,246,0.20)',
            background: '#fff',
            borderRadius: 4,
            padding: '6px 10px',
            fontSize: 12,
            fontFamily: '"Noto Sans SC", sans-serif',
            outline: 'none',
            color: '#1A1F2A',
            opacity: streaming ? 0.6 : 1,
          }}
        />
        <button
          data-testid="stats-chat-send"
          onClick={() => void send()}
          disabled={streaming || !draft.trim()}
          style={{
            background: streaming || !draft.trim() ? '#D1CDB7' : jing.glow,
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            fontSize: 11,
            borderRadius: 4,
            cursor: streaming || !draft.trim() ? 'not-allowed' : 'pointer',
            fontFamily: '"Noto Sans SC", sans-serif',
          }}
        >
          {streaming ? '…' : '问'}
        </button>
      </div>
      <ComplianceLine>数据仅来自你已发布作品 · 不读私信</ComplianceLine>
    </div>
  );
}
