import { SectionTitle } from './SectionTitle';
import engagementSeed from '@/content/seed/stats-engagement.json';

interface StatsEngagement {
  behavior: { label: string; ratio: number; color: string }[];
  comments: { user: string; text: string; time: string }[];
}

export function EngagementTab() {
  const data = engagementSeed as StatsEngagement;
  return (
    <div data-testid="stats-engagement">
      <SectionTitle>互动结构 · 本月</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div
          style={{
            background: '#fff',
            border: '1px solid rgba(23,114,246,0.18)',
            borderRadius: 4,
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              color: '#7A8B9F',
              fontFamily: 'JetBrains Mono, monospace',
              marginBottom: 10,
              letterSpacing: 0.4,
            }}
          >
            读者行为分布
          </div>
          {data.behavior.map((b) => (
            <div key={b.label} style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  marginBottom: 3,
                  fontFamily: '"Noto Sans SC", sans-serif',
                }}
              >
                <span>{b.label}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#5A6270' }}>
                  {(b.ratio * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ height: 4, background: 'rgba(0,0,0,0.05)', borderRadius: 2 }}>
                <div style={{ width: `${b.ratio * 100}%`, height: '100%', background: b.color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid rgba(23,114,246,0.18)',
            borderRadius: 4,
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              color: '#7A8B9F',
              fontFamily: 'JetBrains Mono, monospace',
              marginBottom: 10,
              letterSpacing: 0.4,
            }}
          >
            热点评论摘录
          </div>
          {data.comments.map((c, i) => (
            <div
              key={i}
              style={{
                padding: '8px 0',
                fontSize: 11.5,
                borderBottom: i < data.comments.length - 1 ? '1px solid rgba(74,144,226,0.08)' : 'none',
                lineHeight: 1.5,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  color: '#1772F6',
                  marginBottom: 3,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                <span>{c.user}</span>
                <span>{c.time}</span>
              </div>
              <div style={{ color: '#1A1F2A', fontFamily: '"Noto Serif SC", serif' }}>{c.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
