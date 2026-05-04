'use client';
import { useState, type ReactNode } from 'react';

interface DiffColumnProps {
  label: string;
  subtitle: string;
  accent: string;
  accentBg: string;
  recommended?: boolean;
  accepted?: boolean;
  onAccept?: () => void;
  promptTooltip?: { title: string; body: string; footnote: string };
  children: ReactNode;
}

export function DiffColumn({
  label,
  subtitle,
  accent,
  accentBg,
  recommended,
  accepted,
  onAccept,
  promptTooltip,
  children,
}: DiffColumnProps) {
  const [tipHover, setTipHover] = useState(false);

  return (
    <div style={{
      flex: 1, minWidth: 0,
      display: 'flex', flexDirection: 'column',
      background: accepted ? accentBg : 'transparent',
      transition: 'background .2s',
    }}>
      <div style={{
        flexShrink: 0,
        padding: '10px 14px 8px',
        borderBottom: '1px solid rgba(23,114,246,0.10)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 3, background: accent, flexShrink: 0,
        }}/>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 10.5, color: accent, letterSpacing: 1,
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{label}</span>
            {promptTooltip && (
              <span
                data-testid="diff-column-prompt-icon"
                onMouseEnter={() => setTipHover(true)}
                onMouseLeave={() => setTipHover(false)}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 13, height: 13, borderRadius: 7,
                  border: `1px solid ${accent}`,
                  color: accent, fontSize: 9,
                  cursor: 'help', position: 'relative',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                i
                {tipHover && (
                  <span style={{
                    position: 'absolute', top: '120%', left: 0,
                    background: '#1A1F2A', color: '#F4EAD0',
                    padding: '8px 10px', borderRadius: 3,
                    fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                    width: 280, lineHeight: 1.5,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    letterSpacing: 0.4, zIndex: 200,
                    textAlign: 'left', whiteSpace: 'normal',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: accent }}>
                      {promptTooltip.title}
                    </div>
                    <div style={{ marginBottom: 4 }}>{promptTooltip.body}</div>
                    <div style={{ fontSize: 9, color: '#8FA1B6' }}>
                      {promptTooltip.footnote}
                    </div>
                  </span>
                )}
              </span>
            )}
          </div>
          <div style={{
            fontSize: 10, color: '#5A6270', marginTop: 1,
            fontFamily: '"Noto Sans SC", sans-serif',
          }}>
            {subtitle}
          </div>
        </div>
        {recommended && (
          <span style={{
            fontSize: 9, padding: '1px 6px', borderRadius: 2,
            background: accent, color: '#F4F1E8',
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5,
          }}>看墨推荐</span>
        )}
      </div>
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '14px 16px',
        fontSize: 13.5, lineHeight: 1.85,
        color: '#1A1F2A',
        fontFamily: '"Noto Serif SC", serif',
      }}>
        {children}
      </div>
      <div style={{
        flexShrink: 0,
        padding: '6px 14px',
        borderTop: '1px solid rgba(23,114,246,0.10)',
      }}>
        <button onClick={onAccept} style={{
          width: '100%', padding: '5px 10px',
          fontSize: 11, borderRadius: 3,
          border: `1px solid ${accent}`,
          background: accepted ? accent : 'transparent',
          color: accepted ? '#F4F1E8' : accent,
          cursor: 'pointer', fontFamily: '"Noto Sans SC", sans-serif',
          letterSpacing: 0.5,
        }}>{accepted ? '✓ 已选' : '选这一稿'}</button>
      </div>
    </div>
  );
}

export type { DiffColumnProps };
