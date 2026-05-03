'use client';

interface LorePortalProps {
  onClose: () => void;
}

// TODO plan #12: real interactive village modal (aurora / 9 paper-cut houses / snow / walking foxes).
// This stub renders a basic dimmed overlay so page.tsx can mount it without a missing-import error.
export function LorePortal({ onClose }: LorePortalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(20, 22, 30, 0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <div style={{
        color: '#A89B7E', fontFamily: '"Noto Serif SC", serif',
        fontSize: 14, letterSpacing: 2, textAlign: 'center',
      }}>
        北极小镇 · 待绘
        <br />
        <span style={{ fontSize: 11, opacity: 0.6 }}>(see plan #12 — click anywhere to close)</span>
      </div>
    </div>
  );
}
