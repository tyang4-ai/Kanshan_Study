'use client';

export interface RoundDividerProps {
  round: number;
  label: '初评' | '互评';
}

export function RoundDivider({ round, label }: RoundDividerProps) {
  return (
    <div
      data-testid="round-divider"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '6px 0',
        height: 14,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          borderTop: '1px dashed rgba(0,0,0,0.12)',
        }}
      />
      <span
        style={{
          position: 'relative',
          background: '#FAFBFD',
          padding: '0 8px',
          fontSize: 10,
          color: '#5A6270',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: 0.4,
        }}
      >
        {`第 ${round} 轮 · ${label}`}
      </span>
    </div>
  );
}
