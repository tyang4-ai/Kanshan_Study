import type { ReactNode } from 'react';

export function InlineHl({ children }: { children: ReactNode }) {
  return (
    <span style={{
      background: 'rgba(192,48,40,0.10)',
      borderBottom: '1px dotted #C03028',
      padding: '0 1px',
    }}>{children}</span>
  );
}
