import type { CSSProperties } from 'react';

const wrapperStyle: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-end',
  gap: 12,
  padding: '32px 0 18px',
  background:
    'linear-gradient(to bottom, rgba(250,248,243,0) 0%, rgba(250,248,243,0.92) 55%, #FAF8F3 100%)',
  pointerEvents: 'none',
};

const stampStyle: CSSProperties = {
  fontFamily: 'JetBrains Mono, "Noto Sans SC", sans-serif',
  fontSize: 10.5,
  color: '#7A6655',
  letterSpacing: 0.6,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

export function ComplianceStamp() {
  return (
    <div style={wrapperStyle}>
      <div style={stampStyle}>
        <span>看心 · 已审</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>1 处声明软化</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span>1 处出处待补</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span style={{ opacity: 0.7 }}>16:42</span>
      </div>
    </div>
  );
}

export default ComplianceStamp;
