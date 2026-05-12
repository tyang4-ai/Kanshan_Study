'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  MARGIN_SEAL_OPEN_EVENT,
  type MarginSealOpenDetail,
} from '@/components/compliance/MarginSealChit';
import type { MarginSealKind } from '@/components/editor/MarginSeal';
import {
  findProvenanceForChit,
  findCrossFoxFollowups,
  type ProvenanceEntry,
} from '@/lib/store/provenance';
import { useFloatingWindowStore } from '@/lib/store/floating-window';

// R2 judge fix (李笛 P0 2026-05-12): cross-fox awareness surface. Maps fox
// IDs to display names + verbs for the "X 在重写时绕开此段" footnote.
const CROSS_FOX_LABEL: Record<string, string> = {
  mo: '看墨',
  shui: '看水',
  dian: '看典',
  xin: '看心',
};
function describeCrossFox(e: ProvenanceEntry): string {
  const name = CROSS_FOX_LABEL[e.fox] ?? e.fox;
  if (e.relatedAction === 'avoided') return `${name} 已在重写时绕开此段`;
  if (e.relatedAction === 'sourced-after-flag') return `${name} 已为此段补出处`;
  return `${name} 已对此段做出回应`;
}

interface PopoverState {
  detail: MarginSealOpenDetail;
  entry: ProvenanceEntry | null;
}

// Counsel flagged "审" as an affirmative claim of human-grade review;
// dropped from each label so the chit only states what the workbench
// actually did. Footer disclaimer makes the boundary explicit.
const HEADER_LABEL: Record<MarginSealKind, string> = {
  reviewed: '已软化',
  flag: '待补出处',
  sourced: '已附引用',
};

const FOOTER_DISCLAIMER = '本工作台不替代专业审稿';

const footerStyle: CSSProperties = {
  marginTop: 10,
  paddingTop: 8,
  borderTop: '1px solid rgba(122, 102, 85, 0.18)',
  fontSize: 10,
  color: '#7A6655',
  fontFamily: 'JetBrains Mono, monospace',
  letterSpacing: 0.4,
};

const EMPTY_HEURISTIC: Record<MarginSealKind, string> = {
  reviewed: '可能存在的合规风险类型: 未软化绝对化判断',
  flag: '可能存在的合规风险类型: 临床绝对化判断 / 缺少出处',
  sourced: '可能存在的合规风险类型: 引用记录尚未落档',
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
  const openTab = useFloatingWindowStore((s) => s.openTab);

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

      {detail.kind === 'flag' && entry && (
        <div style={{ marginBottom: 4, fontSize: 12, color: '#A8221C' }}>
          {`${entry.fox} · 检出未注明出处`}
        </div>
      )}

      {entry && (() => {
        const followups = findCrossFoxFollowups(entry.id);
        if (followups.length === 0) return null;
        return (
          <div
            data-testid="margin-seal-popover-crossfox"
            style={{
              marginTop: 4,
              padding: '6px 8px',
              background: 'rgba(31,139,102,0.08)',
              borderLeft: '2px solid #1F8B66',
              fontSize: 11.5,
              color: '#1F5B47',
              fontFamily: '"Noto Serif SC", serif',
            }}
          >
            {followups.map((f) => (
              <div key={f.id}>{describeCrossFox(f)}</div>
            ))}
          </div>
        );
      })()}

      {!entry && (
        <div data-testid="margin-seal-popover-empty" style={{ marginTop: 2 }}>
          <div style={{ fontSize: 11.5, color: '#7A6655', marginBottom: 6 }}>
            {EMPTY_HEURISTIC[detail.kind]}
          </div>
          <button
            type="button"
            data-testid="margin-seal-popover-rerun"
            onClick={() => {
              openTab('persona', '看心 · 重新审一审');
              setState(null);
            }}
            style={{
              border: '1px solid rgba(122,102,85,0.35)',
              background: 'transparent',
              color: '#1F8B66',
              fontSize: 12,
              fontFamily: '"Noto Serif SC", serif',
              padding: '3px 9px',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            点击 看心 重新审一审
          </button>
        </div>
      )}

      <div data-testid="margin-seal-popover-disclaimer" style={footerStyle}>
        {FOOTER_DISCLAIMER}
      </div>
    </div>
  );
}

export default MarginSealPopover;
