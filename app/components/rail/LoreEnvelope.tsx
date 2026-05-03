'use client';

interface LoreEnvelopeProps {
  onClick: () => void;
}

// LoreEnvelope — wax-sealed envelope hidden in the cork rail
// Tucked into the cork's bottom-left, just above the dock. Subtle on its
// own, but pulses softly to invite a click. Click → opens the LorePortal.
// Mounted at workspace shell level (viewport-fixed), NOT inside LeftRail.
export function LoreEnvelope({ onClick }: LoreEnvelopeProps) {
  return (
    <button
      onClick={onClick}
      title="北极小镇 · 九狐之家"
      style={{
        position: 'fixed',
        top: 88, right: 22,
        width: 46, height: 32,
        padding: 0, border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        zIndex: 1500,
        animation: 'envelopePulse 4s ease-in-out infinite'
      }}
    >
      <svg viewBox="0 0 38 26" width="46" height="32">
        {/* Envelope body */}
        <rect x="1" y="3" width="36" height="22" rx="1.5"
          fill="#F7EAD0" stroke="#A89B7E" strokeWidth="0.8" style={{ fill: 'rgb(255, 236, 198)' }} />
        {/* Flap fold lines */}
        <path d="M1 4 L19 16 L37 4"
          fill="#FAF1DC" stroke="#A89B7E" strokeWidth="0.6" />
        {/* Wax seal — round red */}
        <circle cx="19" cy="17" r="4.5"
          fill="#A4221A" stroke="#5A1108" strokeWidth="0.6" />
        <text x="19" y="19.4" textAnchor="middle"
          fontFamily="Noto Serif SC, serif"
          fontSize="5.5" fontWeight="600"
          fill="#F7EAD0">山</text>
        {/* Tiny stamp at upper right */}
        <rect x="29" y="5" width="6" height="6" fill="#C03028" opacity="0.8" />
      </svg>
    </button>
  );
}
