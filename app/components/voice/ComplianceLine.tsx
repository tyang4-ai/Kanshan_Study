import type { ReactNode } from 'react';

export function ComplianceLine({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="voice-compliance-line"
      style={{
        flexShrink: 0,
        padding: '6px 14px',
        background: '#F4F7FB',
        borderTop: '1px solid rgba(23,114,246,0.18)',
        fontSize: 10,
        color: '#5A6B7E',
        fontFamily: '"Noto Serif SC", serif',
        letterSpacing: 0.6,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
}
