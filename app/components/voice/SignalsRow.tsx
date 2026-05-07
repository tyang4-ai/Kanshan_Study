interface Signal {
  label: string;
  value: number;
  tone: 'good' | 'warn' | 'soft' | 'neutral';
}

interface SignalsRowProps {
  signals: Signal[];
}

export function SignalsRow({ signals }: SignalsRowProps) {
  return (
    <div style={{
      marginTop: 14, padding: '8px 0 0',
      borderTop: '1px dashed rgba(42,52,65,0.18)',
      display: 'flex', gap: 10,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 10, color: '#5A6270',
    }}>
      {signals.map((s, i) => {
        const color = s.tone === 'good' ? '#1F8B66'
          : s.tone === 'warn' ? '#C03028'
          : s.tone === 'soft' ? '#9A6F1A' : '#5A6270';
        return (
          <div key={i} style={{ flex: 1 }}>
            <div style={{ letterSpacing: 0.5, fontSize: 9, marginBottom: 2 }}>{s.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                flex: 1, height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${s.value * 100}%`, height: '100%', background: color,
                }}/>
              </div>
              <span style={{ color, fontWeight: 600, minWidth: 24 }}>
                {s.value.toFixed(2)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type { Signal, SignalsRowProps };
