'use client';

import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { useDemoMode } from '@/lib/demo-mode/context';

// Bottom-right floating chat trigger. Click → opens kanshan-chat tab in
// TabbedFloatingWindow. Notion-style affordance per the user's pick on
// 2026-05-09. Uses the official 刘看山 art per CLAUDE.md decision #9.
export function KanshanChatBubble() {
  const openTab = useFloatingWindowStore((s) => s.openTab);
  // R6 demo-flow review (Tan Shulin) P0: on /live the script teleprompter
  // (NextBeatHint) sits at bottom=60 right=16 with height ~107 — its bottom
  // edge lands at y=782 on a 900px tall window, which collides with the
  // 56×56 chat bubble at bottom=24. Lift the bubble on /live so a judge
  // dismissing the teleprompter doesn't hit the bubble by mistake.
  const demoMode = useDemoMode();
  const bottomOffset = demoMode === 'live' ? 188 : 24;

  const handleClick = () => {
    openTab('kanshan-chat', '看山 · 编排');
  };

  return (
    <button
      type="button"
      data-testid="kanshan-chat-bubble"
      aria-label="向看山请教"
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: bottomOffset,
        right: 24,
        zIndex: 1400, // above corkboard, below floating-window (1500)
        width: 56,
        height: 56,
        borderRadius: 28,
        border: '1px solid rgba(168,155,126,0.5)',
        background: 'linear-gradient(140deg, #FAF8F3 0%, #E5DEC8 100%)',
        boxShadow: '0 6px 18px rgba(20,22,30,0.32), 0 1px 4px rgba(20,22,30,0.16)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        transition: 'transform 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <span
        style={{
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 22,
          fontWeight: 600,
          color: '#2A2419',
          letterSpacing: 1,
        }}
      >
        山
      </span>
    </button>
  );
}
