import { KPI } from './KPI';
import { SectionTitle } from './SectionTitle';
import { ChartArea } from './ChartArea';
import overviewSeed from '@/content/seed/stats-overview.json';

interface StatsOverview {
  kpis: { label: string; value: string; delta: string; tone: 'good' | 'warn' | 'neutral' }[];
  spark: number[];
  articles: { title: string; reads: string; likes: number; trend: '↑' | '→' | '↓' }[];
}

export function OverviewTab() {
  const data = overviewSeed as StatsOverview;
  return (
    <div data-testid="stats-overview">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
        {data.kpis.map((k) => (
          <KPI key={k.label} label={k.label} value={k.value} delta={k.delta} tone={k.tone} />
        ))}
      </div>

      <SectionTitle>近 30 日阅读趋势</SectionTitle>
      <div
        style={{
          background: '#fff',
          border: '1px solid rgba(23,114,246,0.18)',
          borderRadius: 4,
          padding: 14,
          marginBottom: 22,
        }}
      >
        <ChartArea data={data.spark} />
      </div>

      <SectionTitle>本月文章 · 表现排行</SectionTitle>
      <div
        style={{
          background: '#fff',
          border: '1px solid rgba(23,114,246,0.18)',
          borderRadius: 4,
        }}
      >
        {data.articles.map((a, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderBottom: i < data.articles.length - 1 ? '1px solid rgba(74,144,226,0.10)' : 'none',
              fontSize: 12,
            }}
          >
            <span
              style={{
                width: 18,
                fontSize: 10,
                color: '#7A8B9F',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              0{i + 1}
            </span>
            <span style={{ flex: 1, fontFamily: '"Noto Serif SC", serif', color: '#1A1F2A' }}>{a.title}</span>
            <span
              style={{
                width: 60,
                textAlign: 'right',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#1A1F2A',
              }}
            >
              {a.reads}
            </span>
            <span
              style={{
                width: 50,
                textAlign: 'right',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#7A8B9F',
              }}
            >
              {a.likes}
            </span>
            <span
              style={{
                width: 16,
                textAlign: 'center',
                fontSize: 14,
                color: a.trend === '↑' ? '#1F8B66' : a.trend === '↓' ? '#C03028' : '#7A8B9F',
              }}
            >
              {a.trend}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
