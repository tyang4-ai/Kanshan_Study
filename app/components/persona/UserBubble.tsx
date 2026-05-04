'use client';

export interface UserBubbleProps {
  text: string;
}

export function UserBubble({ text }: UserBubbleProps) {
  return (
    <div
      data-testid="user-bubble"
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        style={{
          maxWidth: '70%',
          background: '#1772F6',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: 12,
          fontSize: 13,
          lineHeight: 1.5,
          fontFamily: '"Noto Sans SC", sans-serif',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </div>
    </div>
  );
}
