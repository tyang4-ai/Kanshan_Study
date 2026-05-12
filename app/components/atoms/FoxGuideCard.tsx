'use client';
import { type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { FOX_BY_ID, type FoxId } from '@/lib/foxes/registry';
import guidesData from '@/content/seed/fox-guides.json';

interface FoxGuide {
  id: FoxId;
  name: string;
  verb: string;
  canHelp: string;
  whenToCall: string;
}

const GUIDES: Record<FoxId, FoxGuide> = Object.fromEntries(
  (guidesData as FoxGuide[]).map((g) => [g.id, g]),
) as Record<FoxId, FoxGuide>;

const VERB_LABEL: Record<string, string> = {
  orchestrate: '总调度',
  灵感激发: '灵感激发',
  思路梳理: '思路梳理',
  内容精加工: '内容精加工',
};

const CARD_WIDTH = 232;
const CARD_OFFSET = 12;

interface FoxGuideCardProps {
  foxId: FoxId;
  anchorRect: DOMRect;
  onClose: () => void;
}

export function FoxGuideCard({ foxId, anchorRect, onClose }: FoxGuideCardProps) {
  const fox = FOX_BY_ID[foxId];
  const guide = GUIDES[foxId];
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  // Default: place to the right of anchor; flip if it would clip.
  const wouldClipRight = anchorRect.right + CARD_OFFSET + CARD_WIDTH > window.innerWidth;
  const left = wouldClipRight
    ? Math.max(8, anchorRect.left - CARD_OFFSET - CARD_WIDTH)
    : anchorRect.right + CARD_OFFSET;
  const top = Math.max(8, anchorRect.top);

  const handleMouseLeave = () => {
    window.setTimeout(onClose, 150);
  };

  const cardStyle: CSSProperties = {
    position: 'fixed',
    left,
    top,
    width: CARD_WIDTH,
    background: '#FFFDF7',
    border: `1px solid ${fox.glow}`,
    borderRadius: 8,
    padding: '12px 14px',
    boxShadow: `0 8px 20px rgba(0,0,0,0.18), 0 0 0 3px ${fox.glow}1A`,
    zIndex: 4000,
    fontFamily: '"Noto Sans SC", sans-serif',
    pointerEvents: 'auto',
  };

  return createPortal(
    <div
      role="tooltip"
      data-testid="fox-guide-card"
      data-fox-id={foxId}
      onMouseLeave={handleMouseLeave}
      style={cardStyle}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: '"Noto Serif SC", serif',
            fontSize: 15,
            fontWeight: 600,
            color: '#1A1F2A',
            letterSpacing: 0.5,
          }}
        >
          {guide.name}
        </span>
        <span
          data-testid="fox-guide-card-verb-pill"
          style={{
            fontSize: 10.5,
            letterSpacing: 0.6,
            padding: '2px 8px',
            borderRadius: 10,
            background: fox.glow,
            color: '#FFFDF7',
            whiteSpace: 'nowrap',
          }}
        >
          {VERB_LABEL[guide.verb] ?? guide.verb}
        </span>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontSize: 10,
            color: '#9A8A75',
            letterSpacing: 0.4,
            marginBottom: 2,
          }}
        >
          我能帮你
        </div>
        <div
          data-testid="fox-guide-card-can-help"
          style={{ fontSize: 12.5, color: '#3A2E20', lineHeight: 1.55 }}
        >
          {guide.canHelp}
        </div>
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            color: '#9A8A75',
            letterSpacing: 0.4,
            marginBottom: 2,
          }}
        >
          叫我的时机
        </div>
        <div
          data-testid="fox-guide-card-when-to-call"
          style={{ fontSize: 12.5, color: '#3A2E20', lineHeight: 1.55 }}
        >
          {guide.whenToCall}
        </div>
      </div>
    </div>,
    document.body,
  );
}
