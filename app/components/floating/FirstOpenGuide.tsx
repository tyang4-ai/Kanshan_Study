'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import type { TabKind } from '@/lib/store/floating-window';
import guidesData from '@/content/seed/window-guides.json';

interface WindowGuide {
  title: string;
  subtitle: string;
  bullets: string[];
  tryFirst: string;
}

const GUIDES: Record<TabKind, WindowGuide> = guidesData as Record<TabKind, WindowGuide>;

const STORAGE_KEY = (kind: TabKind) => `kanshan-window-guide-seen:${kind}`;

interface FirstOpenGuideProps {
  kind: TabKind;
}

/**
 * One-time overlay that explains what a floating window does and how to use
 * it. Mounts inside `TabBody` for every kind. Dismissal is persisted per-kind
 * in localStorage so the user only sees each guide once per browser.
 */
export function FirstOpenGuide({ kind }: FirstOpenGuideProps) {
  const [show, setShow] = useState(false);
  const guide = GUIDES[kind];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY(kind));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(seen !== '1');
    } catch {
      setShow(false);
    }
  }, [kind]);

  const dismiss = (): void => {
    setShow(false);
    try {
      window.localStorage.setItem(STORAGE_KEY(kind), '1');
    } catch {
      /* quota or disabled — fine, just won't persist */
    }
  };

  if (!show || !guide) return null;

  const overlay: CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'rgba(20, 22, 30, 0.55)',
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)',
    zIndex: 4500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  };

  const card: CSSProperties = {
    width: 'min(520px, 100%)',
    maxHeight: 'calc(100% - 20px)',
    overflowY: 'auto',
    background: '#FFFCF4',
    border: '1px solid rgba(168,155,126,0.45)',
    borderRadius: 6,
    boxShadow: '0 14px 40px rgba(0,0,0,0.25)',
    padding: '22px 24px',
    fontFamily: '"Noto Serif SC", serif',
    color: '#1A1F2A',
  };

  const titleStyle: CSSProperties = {
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: 1.2,
    color: '#2A2419',
    marginBottom: 4,
  };

  const subtitleStyle: CSSProperties = {
    fontSize: 11,
    letterSpacing: 2,
    color: '#7A6F5A',
    fontFamily: 'JetBrains Mono, monospace',
    marginBottom: 16,
  };

  const sectionLabel: CSSProperties = {
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#9A8A75',
    fontFamily: 'JetBrains Mono, monospace',
    marginBottom: 6,
    marginTop: 4,
  };

  const bulletList: CSSProperties = {
    fontSize: 13,
    lineHeight: 1.75,
    color: '#3A3225',
    margin: '0 0 14px 18px',
    padding: 0,
  };

  const tryStyle: CSSProperties = {
    background: 'rgba(168,155,126,0.12)',
    border: '1px solid rgba(168,155,126,0.25)',
    borderRadius: 4,
    padding: '10px 12px',
    fontSize: 12.5,
    color: '#5A4E33',
    fontFamily: '"Noto Sans SC", sans-serif',
    marginBottom: 16,
    lineHeight: 1.55,
  };

  const buttonRow: CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
  };

  const primaryBtn: CSSProperties = {
    padding: '8px 16px',
    background: '#2A2419',
    color: '#FAF8F3',
    border: '1px solid #2A2419',
    borderRadius: 3,
    fontFamily: '"Noto Serif SC", serif',
    fontSize: 13,
    letterSpacing: 1.5,
    cursor: 'pointer',
  };

  return (
    <div
      data-testid={`first-open-guide-${kind}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`first-open-guide-title-${kind}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
      style={overlay}
    >
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div id={`first-open-guide-title-${kind}`} style={titleStyle}>{guide.title}</div>
        <div style={subtitleStyle}>{guide.subtitle}</div>

        <div style={sectionLabel}>它能帮你做什么</div>
        <ul style={bulletList}>
          {guide.bullets.map((b) => <li key={b}>{b}</li>)}
        </ul>

        <div style={sectionLabel}>第一步试试</div>
        <div style={tryStyle}>{guide.tryFirst}</div>

        <div style={buttonRow}>
          <button
            type="button"
            data-testid={`first-open-guide-dismiss-${kind}`}
            onClick={dismiss}
            style={primaryBtn}
          >
            知道了 · 开始用
          </button>
        </div>
      </div>
    </div>
  );
}
