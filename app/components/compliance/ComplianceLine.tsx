import type { CSSProperties, ReactNode } from 'react';

export type ComplianceLineTone = 'neutral' | 'warn';

interface Props {
  children: ReactNode;
  tone?: ComplianceLineTone;
}

const baseStyle: CSSProperties = {
  flexShrink: 0,
  padding: '6px 14px',
  borderTop: '1px solid rgba(23,114,246,0.18)',
  fontSize: 10,
  color: '#5A6B7E',
  fontFamily: '"Noto Serif SC", serif',
  letterSpacing: 0.6,
  textAlign: 'center',
};

const toneStyle: Record<ComplianceLineTone, CSSProperties> = {
  neutral: { background: '#F4F7FB' },
  warn: { background: 'rgba(184, 85, 67, 0.06)', color: '#7A4A40', borderTopColor: 'rgba(184,85,67,0.25)' },
};

export function ComplianceLine({ children, tone = 'neutral' }: Props) {
  return (
    <div data-testid="compliance-line" data-tone={tone} style={{ ...baseStyle, ...toneStyle[tone] }}>
      {children}
    </div>
  );
}
