'use client';

import { FOX_BY_ID, type FoxId } from '@/lib/foxes/registry';

export interface PersonaMessageProps {
  id?: string;
  round?: 1 | 2 | 3;
  foxId: string;
  mask: string;
  text: string;
  tags: string[];
  replyToMask?: string;
  agree?: boolean | null;
  time?: string;
}

export function PersonaMessage({
  foxId,
  mask,
  text,
  tags,
  replyToMask,
  agree,
  time = '刚刚',
}: PersonaMessageProps) {
  const f = FOX_BY_ID[foxId as FoxId];
  const dotColor =
    agree === true ? '#2ECC71' : agree === false ? '#C03028' : '#A89B7E';
  const verb =
    agree === true ? '附议' : agree === false ? '不同意' : '回应';

  return (
    <div
      data-testid="persona-message"
      style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
    >
      <div
        style={{
          position: 'relative',
          width: 26,
          height: 26,
          borderRadius: 13,
          background: f.glow,
          color: '#fff',
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 6px ${f.glowSoft}55`,
        }}
      >
        {f.initial}
        {mask && (
          <span
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 11,
              height: 11,
              borderRadius: 6,
              background: '#1F2F40',
              color: '#A8C8FF',
              fontSize: 8,
              fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid #FAFBFD',
              lineHeight: 1,
            }}
          >
            面
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            marginBottom: 3,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#1A1F2A',
              fontFamily: '"Noto Serif SC", serif',
            }}
          >
            {f.name}
          </span>
          {mask && (
            <span
              style={{
                fontSize: 9.5,
                padding: '1px 6px',
                borderRadius: 3,
                background: 'rgba(23,114,246,0.10)',
                color: '#1772F6',
                fontFamily: '"Noto Sans SC", sans-serif',
                fontWeight: 500,
                border: '0.5px solid rgba(23,114,246,0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <span
                style={{
                  fontSize: 8,
                  opacity: 0.7,
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: 0.4,
                }}
              >
                面具
              </span>
              {mask}
            </span>
          )}
          <span
            style={{
              fontSize: 9.5,
              color: '#7A8B9F',
              marginLeft: 'auto',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {time}
          </span>
        </div>

        {replyToMask && (
          <div
            data-testid="persona-message-reply-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              color: '#5A6270',
              background: '#F0F3F8',
              padding: '1px 7px',
              borderRadius: 8,
              marginBottom: 4,
              fontFamily: '"Noto Sans SC", sans-serif',
            }}
          >
            <span
              data-testid="persona-message-reply-dot"
              style={{
                display: 'inline-block',
                width: 5,
                height: 5,
                borderRadius: 2,
                background: dotColor,
              }}
            />
            {verb}{' '}
            <span style={{ color: '#1772F6', fontWeight: 500 }}>
              {`「${replyToMask}」`}
            </span>
          </div>
        )}

        <div
          style={{
            fontSize: 13,
            color: '#1A1F2A',
            lineHeight: 1.6,
            fontFamily: '"Noto Serif SC", serif',
          }}
        >
          {text}
        </div>

        {tags && tags.length > 0 && (
          <div
            data-testid="persona-message-tags"
            style={{
              display: 'flex',
              gap: 5,
              marginTop: 6,
              flexWrap: 'wrap',
            }}
          >
            {tags.map((t, i) => (
              <span
                key={i}
                style={{
                  fontSize: 9.5,
                  padding: '1px 7px',
                  borderRadius: 3,
                  background: 'rgba(23,114,246,0.08)',
                  color: '#1772F6',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: 0.3,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
