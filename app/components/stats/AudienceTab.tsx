import { SectionTitle } from './SectionTitle';
import audienceSeed from '@/content/seed/stats-audience.json';

interface StatsAudience {
  sample: number;
  readerTypes: { label: string; ratio: number }[];
  wordCloud: { term: string; weight: number }[];
}

export function AudienceTab() {
  const data = audienceSeed as StatsAudience;
  return (
    <div data-testid="stats-audience">
      <SectionTitle>读者画像 · 加权样本 {data.sample.toLocaleString()}</SectionTitle>
      <div
        style={{
          background: '#fff',
          border: '1px solid rgba(23,114,246,0.18)',
          borderRadius: 4,
          padding: 14,
          marginBottom: 14,
        }}
      >
        {data.readerTypes.map((r) => (
          <div key={r.label} style={{ marginBottom: 10 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11.5,
                marginBottom: 3,
                fontFamily: '"Noto Sans SC", sans-serif',
              }}
            >
              <span>{r.label}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#5A6270' }}>
                {(r.ratio * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ height: 5, background: 'rgba(0,0,0,0.05)', borderRadius: 3 }}>
              <div style={{ width: `${r.ratio * 100}%`, height: '100%', background: '#1772F6', borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>

      <SectionTitle>读者关心的关键词 · 词云</SectionTitle>
      <div
        style={{
          background: '#fff',
          border: '1px solid rgba(23,114,246,0.18)',
          borderRadius: 4,
          padding: 18,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {data.wordCloud.map((w, i) => (
          <span
            key={i}
            style={{
              fontSize: w.weight,
              color: i % 2 === 0 ? '#1772F6' : '#1F8B66',
              fontFamily: '"Noto Serif SC", serif',
              fontWeight: w.weight > 18 ? 600 : 400,
              opacity: 0.5 + w.weight / 50,
            }}
          >
            {w.term}
          </span>
        ))}
      </div>
    </div>
  );
}
