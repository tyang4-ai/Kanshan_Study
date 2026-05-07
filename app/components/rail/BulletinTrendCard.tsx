'use client';

import type { CSSProperties, ReactNode } from 'react';
import { RelCard } from './RelCard';
import {
  isTrendsAcknowledged,
  markTrendsAcknowledged,
} from '@/components/floating/TrendsConfirmModal';
import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { useTrendsGateStore } from '@/lib/store/trends-gate';

const ZERO_RECT: DOMRect = {
  x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0,
  toJSON: () => ({}),
} as DOMRect;

interface BulletinTrendCardProps {
  title: string;
  meta: string;
  rotate?: number;
  offsetX?: number;
  pinColor?: string;
  children?: ReactNode;
}

const labelStyle: CSSProperties = {
  fontFamily: '"Noto Sans SC", sans-serif',
  fontSize: 9.5,
  fontWeight: 600,
  color: '#1772F6',
  letterSpacing: 1,
  textTransform: 'uppercase',
  marginBottom: 6,
};

const titleStyle: CSSProperties = {
  fontFamily: '"Noto Serif SC", serif',
  fontSize: 12.5,
  color: '#1A1F2A',
  lineHeight: 1.45,
  fontWeight: 500,
};

const metaStyle: CSSProperties = {
  fontSize: 9.5,
  color: '#7A6655',
  marginTop: 6,
  fontFamily: '"Noto Sans SC", sans-serif',
};

export function BulletinTrendCard({
  title,
  meta,
  rotate = -2.5,
  offsetX = -2,
  pinColor = '#1772F6',
}: BulletinTrendCardProps) {
  const requestGate = useTrendsGateStore((s) => s.request);

  const onClick = () => {
    if (isTrendsAcknowledged()) {
      markTrendsAcknowledged(); // refresh TTL
      useFloatingWindowStore.getState().openTab('research', '看水 · 考据卷', {
        selection: { text: title, rect: ZERO_RECT },
      });
      return;
    }
    requestGate({ title });
  };

  return (
    <div
      data-testid="bulletin-trend-card"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <RelCard rotate={rotate} pinColor={pinColor} offsetX={offsetX}>
        <div style={labelStyle}>看势 · 热榜</div>
        <div style={titleStyle}>{title}</div>
        <div style={metaStyle}>{meta}</div>
      </RelCard>
    </div>
  );
}
