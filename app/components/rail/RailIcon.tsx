interface RailIconProps {
  kind: 'search' | 'add';
}

export function RailIcon({ kind }: RailIconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ color: 'rgba(26,31,42,0.5)', cursor: 'pointer' }}>
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
