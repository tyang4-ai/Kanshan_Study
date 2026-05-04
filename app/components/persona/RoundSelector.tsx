'use client';

export interface RoundSelectorProps {
  value: 1 | 2 | 3;
  onChange: (v: 1 | 2 | 3) => void;
  disabled?: boolean;
}

const ROUNDS: Array<1 | 2 | 3> = [1, 2, 3];

export function RoundSelector({
  value,
  onChange,
  disabled = false,
}: RoundSelectorProps) {
  return (
    <div
      data-testid="round-selector"
      role="group"
      aria-label="评议轮数"
      style={{
        display: 'inline-flex',
        background: 'rgba(0,0,0,0.06)',
        borderRadius: 6,
        padding: 2,
        gap: 2,
      }}
    >
      {ROUNDS.map((r) => {
        const active = r === value;
        return (
          <button
            key={r}
            type="button"
            disabled={disabled}
            title={disabled ? '多人格才能互评' : undefined}
            aria-pressed={active}
            onClick={() => onChange(r)}
            style={{
              minWidth: 24,
              padding: '3px 8px',
              borderRadius: 4,
              border: 'none',
              background: active ? '#1772F6' : 'transparent',
              color: disabled
                ? '#A8B0BA'
                : active
                  ? '#fff'
                  : '#5A6270',
              fontSize: 11.5,
              fontFamily: 'JetBrains Mono, monospace',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.55 : 1,
              transition: 'background 120ms ease, color 120ms ease',
            }}
          >
            {r}
          </button>
        );
      })}
    </div>
  );
}
