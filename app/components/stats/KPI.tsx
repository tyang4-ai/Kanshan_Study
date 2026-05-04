interface KPIProps {
  label: string;
  value: string;
  delta: string;
  tone: 'good' | 'warn' | 'neutral';
}

export function KPI({ label, value, delta, tone }: KPIProps) {
  const color = tone === 'good' ? '#1F8B66' : tone === 'warn' ? '#C03028' : '#7A8B9F';
  return (
    <div
      data-testid="stats-kpi"
      style={{
        background: '#fff',
        border: '1px solid rgba(23,114,246,0.18)',
        borderRadius: 4,
        padding: '10px 14px',
      }}
    >
      <div style={{ fontSize: 10, color: '#7A8B9F', letterSpacing: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4, color: '#1A1F2A', fontFamily: '"Noto Serif SC", serif' }}>{value}</div>
      <div style={{ fontSize: 10, color, marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>{delta}</div>
    </div>
  );
}
