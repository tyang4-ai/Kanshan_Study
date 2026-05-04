'use client';
import { useState } from 'react';
import { ComplianceLine } from '@/components/compliance/ComplianceLine';
import { OverviewTab } from '@/components/stats/OverviewTab';
import { EngagementTab } from '@/components/stats/EngagementTab';
import { AudienceTab } from '@/components/stats/AudienceTab';
import { IncomeTab } from '@/components/stats/IncomeTab';
import { FOX_BY_ID } from '@/lib/foxes/registry';

type SubTabId = 'overview' | 'engagement' | 'audience' | 'income';

const SUB_TABS: { id: SubTabId; label: string }[] = [
  { id: 'overview', label: '总览' },
  { id: 'engagement', label: '阅读热度' },
  { id: 'audience', label: '读者画像' },
  { id: 'income', label: '收益' },
];

export function StatsTab() {
  const [tab, setTab] = useState<SubTabId>('overview');
  const jing = FOX_BY_ID.jing;

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

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'engagement' && <EngagementTab />}
        {tab === 'audience' && <AudienceTab />}
        {tab === 'income' && <IncomeTab />}
      </div>

      {/* 看镜 chat affordance */}
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
          }}
        />
        <button
          data-testid="stats-chat-send"
          onClick={() => console.log('TODO plan #11: 看镜 chat')}
          style={{
            background: jing.glow,
            color: '#fff',
            border: 'none',
            padding: '6px 12px',
            fontSize: 11,
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: '"Noto Sans SC", sans-serif',
          }}
        >
          问
        </button>
      </div>
      <ComplianceLine>数据仅来自你已发布作品 · 不读私信</ComplianceLine>
    </div>
  );
}
