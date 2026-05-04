'use client';

export interface DotProps {
  delay?: number;
}

export function Dot({ delay = 0 }: DotProps) {
  return (
    <span
      data-testid="persona-dot"
      style={{
        width: 4,
        height: 4,
        borderRadius: 2,
        background: '#7A8B9F',
        animation: `pulse 1.2s ${delay}s ease-in-out infinite`,
        display: 'inline-block',
      }}
    />
  );
}
