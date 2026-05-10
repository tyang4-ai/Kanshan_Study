interface RailIconProps {
  kind: 'search' | 'add';
  onClick?: () => void;
  active?: boolean;
  ariaLabel?: string;
}

export function RailIcon({ kind, onClick, active, ariaLabel }: RailIconProps) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={ariaLabel ?? (kind === 'search' ? '搜索' : '添加便签')}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        color: active ? 'rgba(26,31,42,0.95)' : 'rgba(26,31,42,0.5)',
        cursor: onClick ? 'pointer' : 'default',
        outline: 'none',
      }}
    >
      {kind === 'search' ? (
        <>
          <circle cx="6" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
          <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </>
      ) : (
        <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      )}
    </svg>
  );
}
