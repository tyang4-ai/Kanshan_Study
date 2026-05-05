'use client';
import { useState, type CSSProperties } from 'react';
import { ComplianceLine } from '@/components/compliance/ComplianceLine';
import { TrendItem } from '@/components/trends/TrendItem';
import {
  TrendsConfirmModal,
  isTrendsAcknowledged,
  markTrendsAcknowledged,
} from '@/components/floating/TrendsConfirmModal';
import { FOX_BY_ID } from '@/lib/foxes/registry';
import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { useZhihuBudgetStore } from '@/lib/zhihu/budget';
import relevantData from '@/content/seed/trends-relevant.json';
import allData from '@/content/seed/trends-all.json';

interface TrendSeed {
  id: string;
  rank: number;
  title: string;
  heat: string;
  ageHours: number;
  ageLabel: string;
  tags: string[];
  hot: boolean;
  vibes: string;
  vibesFox: 'shi' | 'jing' | null;
}

const RELEVANT_TRENDS = relevantData as TrendSeed[];
const ALL_TRENDS = allData as TrendSeed[];

const ZERO_RECT: DOMRect = {
  x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0,
  toJSON: () => ({}),
} as DOMRect;

type TabId = 'relevant' | 'all';

export function TrendsTab() {
  const [tab, setTab] = useState<TabId>('relevant');
  const [pendingTrend, setPendingTrend] = useState<TrendSeed | null>(null);
  const remaining = useZhihuBudgetStore((s) => s.remaining('hot_list'));
  const used = 100 - remaining;

  const shi = FOX_BY_ID.shi;
  const list = tab === 'relevant' ? RELEVANT_TRENDS : ALL_TRENDS;

  const runOpenResearch = (t: TrendSeed) => {
    useFloatingWindowStore.getState().openTab('research', '看水 · 考据卷', {
      selection: { text: t.title, rect: ZERO_RECT },
    });
  };

  const onTrendClick = (t: TrendSeed) => {
    if (isTrendsAcknowledged()) {
      runOpenResearch(t);
      return;
    }
    setPendingTrend(t);
  };

  const handleConfirm = () => {
    markTrendsAcknowledged();
    if (pendingTrend) runOpenResearch(pendingTrend);
    setPendingTrend(null);
  };

  const handleCancel = () => {
    setPendingTrend(null);
  };

  const containerStyle: CSSProperties = {
    width: '100%', height: '100%',
    background: '#FAFBFD',
    display: 'flex', flexDirection: 'column',
    fontFamily: '"Noto Sans SC", -apple-system, sans-serif',
    overflow: 'hidden',
    color: '#1A1F2A',
  };

  const headerStyle: CSSProperties = {
    flexShrink: 0,
    padding: '10px 14px',
    background: 'linear-gradient(180deg, #2C4258 0%, #1F2F40 100%)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    userSelect: 'none',
  };

  const avatarStyle: CSSProperties = {
    width: 28, height: 28, borderRadius: 14,
    background: '#1772F6', color: '#fff',
    fontFamily: '"Noto Serif SC", serif', fontSize: 14, fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 8px rgba(122,177,237,0.6)',
  };

  const titleStyle: CSSProperties = {
    fontSize: 13, fontWeight: 600, letterSpacing: 1.5,
    fontFamily: '"Noto Serif SC", serif', color: '#E8EEF5',
  };

  const subtitleStyle: CSSProperties = {
    fontSize: 10, color: '#8FA1B6', marginTop: 1,
    fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.4,
  };

  const pulseStyle: CSSProperties = {
    width: 8, height: 8, borderRadius: 4, background: '#1772F6',
    boxShadow: '0 0 8px #1772F6',
    animation: 'pulse 1.2s ease-in-out infinite',
  };

  const tabStripStyle: CSSProperties = {
    flexShrink: 0, display: 'flex', gap: 0,
    background: '#F0F3F8',
    borderBottom: '1px solid rgba(23,114,246,0.18)',
    padding: '0 12px',
  };

  const tabButton = (active: boolean): CSSProperties => ({
    padding: '8px 14px',
    border: 'none',
    background: 'transparent',
    color: active ? '#1772F6' : '#5A6270',
    fontSize: 11.5,
    cursor: 'pointer',
    borderBottom: active ? '2px solid #1772F6' : '2px solid transparent',
    fontWeight: active ? 600 : 400,
    fontFamily: '"Noto Sans SC", sans-serif',
  });

  const tabCountStyle: CSSProperties = {
    opacity: 0.6,
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10,
  };

  const cachedStyle: CSSProperties = {
    padding: '8px 0',
    fontSize: 10,
    color: '#7A8B9F',
    fontFamily: 'JetBrains Mono, monospace',
    letterSpacing: 0.5,
    alignSelf: 'center',
  };

  const listStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    background: '#fff',
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={avatarStyle}>{shi.initial}</div>
        <div style={{ flex: 1 }}>
          <div style={titleStyle}>看势 · 热榜雷达</div>
          <div style={subtitleStyle}>
            {`ZHIHU·HOT_LIST · 60 秒 刷新 · 100/天 已用 ${used}`}
          </div>
        </div>
        <span style={pulseStyle} />
      </div>

      {/* Tab strip */}
      <div style={tabStripStyle}>
        <button
          data-testid="trends-tab-relevant"
          data-active={tab === 'relevant'}
          onClick={() => setTab('relevant')}
          style={tabButton(tab === 'relevant')}
        >
          与你有关 <span style={tabCountStyle}>· {RELEVANT_TRENDS.length}</span>
        </button>
        <button
          data-testid="trends-tab-all"
          data-active={tab === 'all'}
          onClick={() => setTab('all')}
          style={tabButton(tab === 'all')}
        >
          全榜 <span style={tabCountStyle}>· {ALL_TRENDS.length}</span>
        </button>
        <div style={{ flex: 1 }} />
        <span style={cachedStyle}>16:42 · 已缓存</span>
      </div>

      {/* Trends list */}
      <div style={listStyle}>
        {list.map((t, i) => (
          <TrendItem
            key={t.id}
            rank={i + 1}
            title={t.title}
            heat={t.heat}
            ageLabel={t.ageLabel}
            tags={t.tags}
            hot={t.hot}
            vibes={t.vibes}
            onClick={() => onTrendClick(t)}
          />
        ))}
      </div>

      <ComplianceLine>看势仅供选题灵感 · 不做热点自动扩写</ComplianceLine>

      <TrendsConfirmModal
        open={pendingTrend !== null}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
