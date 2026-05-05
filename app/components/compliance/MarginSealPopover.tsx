'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  MARGIN_SEAL_OPEN_EVENT,
  type MarginSealOpenDetail,
} from '@/components/compliance/MarginSealChit';
import type { MarginSealKind } from '@/components/editor/MarginSeal';
import { findProvenanceForChit, type ProvenanceEntry } from '@/lib/store/provenance';

interface PopoverState {
  detail: MarginSealOpenDetail;
  entry: ProvenanceEntry | null;
}

const HEADER_LABEL: Record<MarginSealKind, string> = {
  reviewed: '已审 · 已软化',
  flag: '待补出处',
  sourced: '已附引用',
};

const wrapperStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 200,
  width: 280,
  background: '#FAF8F3',
  border: '1px solid rgba(122, 102, 85, 0.35)',
  borderRadius: 6,
  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  padding: '12px 14px',
  fontFamily: '"Noto Serif SC", serif',
  color: '#1A1F2A',
  fontSize: 13,
  lineHeight: 1.55,
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
  fontSize: 12,
  color: '#7A6655',
  letterSpacing: 0.6,
};

const closeStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: '#7A6655',
  fontSize: 14,
  padding: 0,
  lineHeight: 1,
};

const sectionLabelStyle: CSSProperties = {
  fontSize: 10,
  color: '#7A6655',
  letterSpacing: 0.4,
  marginBottom: 2,
};

const fragmentStyle: CSSProperties = {
  background: 'rgba(122, 102, 85, 0.08)',
  padding: '6px 8px',
  borderLeft: '2px solid #B65A5A',
  fontSize: 12.5,
  marginBottom: 8,
};

export function MarginSealPopover() {
  const [state, setState] = useState<PopoverState | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onOpen(ev: Event) {
      const ce = ev as CustomEvent<MarginSealOpenDetail>;
      const detail = ce.detail;
      if (!detail) return;
      const entry = findProvenanceForChit(detail.kind, detail.text);
      setState({ detail, entry });
    }
    document.addEventListener(MARGIN_SEAL_OPEN_EVENT, onOpen);
    return () => document.removeEventListener(MARGIN_SEAL_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!state) return;
    function onClickOutside(ev: MouseEvent) {
      const t = ev.target as Node | null;
      if (ref.current && t && !ref.current.contains(t)) {
        setState(null);
      }
    }
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') setState(null);
    }
    // Defer one tick so the opening mousedown doesn't immediately close it.
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', onClickOutside);
      document.addEventListener('keydown', onKey);
    }, 0);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [state]);

  if (!state) return null;

  const { detail, entry } = state;
  const left = Math.min(detail.rect.left, window.innerWidth - 300);
  const top = detail.rect.bottom + 6;

  return (
    <div
      ref={ref}
      data-testid="margin-seal-popover"
      data-kind={detail.kind}
      style={{ ...wrapperStyle, left, top }}
    >
      <div style={headerStyle}>
        <span>看心 · {HEADER_LABEL[detail.kind]}</span>
        <button
          type="button"
          aria-label="关闭"
          style={closeStyle}
          onClick={() => setState(null)}
        >
          ×
        </button>
      </div>

      <div style={sectionLabelStyle}>原文片段</div>
      <div style={fragmentStyle} data-testid="margin-seal-popover-excerpt">
        {entry?.excerpt ?? detail.text}
      </div>

      {detail.kind === 'reviewed' && entry && (
        <>
          <div style={sectionLabelStyle}>建议改写</div>
          <div style={{ marginBottom: 8, fontSize: 12.5 }}>
            已自动添加柔化措辞，避免绝对化表述。
          </div>
        </>
      )}

      {detail.kind === 'sourced' && entry && (
        <>
          <div style={sectionLabelStyle}>引用来源</div>
          <div style={{ marginBottom: 8, fontSize: 12.5 }}>
            {entry.fox} · 已附可溯引用
          </div>
        </>
      )}

      {detail.kind === 'flag' && (
        <div style={{ marginBottom: 4, fontSize: 12, color: '#A8221C' }}>
          {entry ? `${entry.fox} · 检出未注明出处` : '此处尚未匹配到记录'}
        </div>
      )}
    </div>
  );
}

export default MarginSealPopover;
