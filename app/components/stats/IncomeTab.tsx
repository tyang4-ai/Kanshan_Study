import { KPI } from './KPI';
import { SectionTitle } from './SectionTitle';
import { ChartArea } from './ChartArea';
import incomeSeed from '@/content/seed/stats-income.json';

interface StatsIncome {
  kpis: { label: string; value: string; delta: string; tone: 'good' | 'warn' | 'neutral' }[];
  monthly: { month: string; amount: number }[];
}

export function IncomeTab() {
  const data = incomeSeed as StatsIncome;
  return (
    <div data-testid="stats-income">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
        {data.kpis.map((k) => (
          <KPI key={k.label} label={k.label} value={k.value} delta={k.delta} tone={k.tone} />
        ))}
      </div>
      <SectionTitle>近 6 月趋势</SectionTitle>
      <div
        style={{
          background: '#fff',
          border: '1px solid rgba(23,114,246,0.18)',
          borderRadius: 4,
          padding: 14,
        }}
      >
        <ChartArea data={data.monthly.map((m) => m.amount)} barMode />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginTop: 8,
            fontSize: 10,
            color: '#7A8B9F',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          {data.monthly.map((m) => (
            <span key={m.month}>{m.month}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
