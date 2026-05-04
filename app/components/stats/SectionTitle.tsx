import type { ReactNode } from 'react';

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="stats-section-title"
      style={{
        fontSize: 11,
        color: '#1772F6',
        letterSpacing: 1.5,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 600,
        marginBottom: 8,
        borderLeft: '3px solid #1772F6',
        paddingLeft: 8,
      }}
    >
      {children}
    </div>
  );
}
