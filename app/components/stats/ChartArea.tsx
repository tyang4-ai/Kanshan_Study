interface ChartAreaProps {
  data: number[];
  barMode?: boolean;
}

export function ChartArea({ data, barMode }: ChartAreaProps) {
  const max = Math.max(1, ...data);
  const w = 700;
  const h = 140;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((v, i) => `${i * step},${h - (v / max) * h * 0.9}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;

  if (barMode) {
    const bw = data.length > 0 ? w / data.length - 8 : 0;
    return (
      <svg data-testid="stats-chart" data-mode="bar" viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 140 }}>
        {data.map((v, i) => (
          <rect
            key={i}
            x={i * (w / data.length) + 4}
            y={h - (v / max) * h * 0.9}
            width={bw}
            height={(v / max) * h * 0.9}
            fill="#1772F6"
            opacity={0.5 + (i / data.length) * 0.5}
          />
        ))}
      </svg>
    );
  }

  return (
    <svg data-testid="stats-chart" data-mode="line" viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 140 }}>
      <defs>
        <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1772F6" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#1772F6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#chart-grad)" />
      <polyline points={pts} fill="none" stroke="#1772F6" strokeWidth="2" />
      {data.map((v, i) =>
        i === data.length - 1 ? (
          <circle
            key={i}
            cx={i * step}
            cy={h - (v / max) * h * 0.9}
            r="3.5"
            fill="#1772F6"
            stroke="#fff"
            strokeWidth="1.5"
          />
        ) : null,
      )}
    </svg>
  );
}
