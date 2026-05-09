'use client';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { getFox } from '@/lib/foxes/registry';

interface TechDetailsPanelProps {
  onClose: () => void;
}

type OnboardingMode = 'guest' | 'byo-key' | null;

interface OnboardingPayload {
  mode?: OnboardingMode;
}

function readOnboardingMode(): OnboardingMode {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('kanshan-onboarding');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OnboardingPayload;
    if (parsed.mode === 'guest' || parsed.mode === 'byo-key') return parsed.mode;
    return null;
  } catch {
    // Older versions might have stored the bare string.
    if (raw === 'guest' || raw === 'byo-key') return raw;
    return null;
  }
}

const TECH_STACK = 'Next.js 15 · React 19 · TypeScript · Tailwind v4 · TipTap · Drizzle · Supabase · pgvector · BGE-M3 · Kimi-K2 (默认) · DeepSeek-V3/R1 (BYO 备选) · Zustand · Framer Motion';
const REPO_URL = 'https://github.com/tyang4-ai/Kanshan_Study';

export function TechDetailsPanel({ onClose }: TechDetailsPanelProps) {
  const [mode, setMode] = useState<OnboardingMode>(() => readOnboardingMode());
  const shan = getFox('shan');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSwapKey = () => {
    if (typeof window === 'undefined') return;
    const ok = window.confirm('清除当前密钥并重新选择模式？');
    if (!ok) return;
    window.localStorage.removeItem('kanshan-onboarding');
    setMode(null);
  };

  const modeLabel = mode === 'byo-key'
    ? '已自带密钥 · 无限速'
    : mode === 'guest'
      ? '受限模式 · 共享配额'
      : '未配置';

  const backdrop: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 3500,
    background: 'rgba(10,18,38,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  };

  const card: CSSProperties = {
    maxWidth: 540,
    width: 'min(540px, 92vw)',
    maxHeight: '88vh',
    overflowY: 'auto',
    background: 'rgba(20,22,30,0.85)',
    border: '1px solid rgba(168,155,126,0.45)',
    borderRadius: 2,
    padding: '24px 28px',
    color: '#E6EFFF',
    fontFamily: '"Noto Serif SC", serif',
    boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
    position: 'relative',
  };

  const closeBtn: CSSProperties = {
    position: 'absolute',
    top: 14,
    right: 14,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.16)',
    color: '#E6EFFF',
    fontFamily: '"Noto Serif SC", serif',
    fontSize: 11,
    letterSpacing: 3,
    padding: '5px 12px',
    borderRadius: 2,
    cursor: 'pointer',
  };

  const sectionHeading: CSSProperties = {
    fontSize: 11,
    letterSpacing: 4,
    color: 'rgba(168,155,126,0.85)',
    fontFamily: 'JetBrains Mono, monospace',
    marginBottom: 6,
    marginTop: 18,
    textTransform: 'uppercase',
  };

  const bodyText: CSSProperties = {
    fontSize: 13,
    lineHeight: 1.7,
    color: '#C5D2E2',
  };

  const linkStyle: CSSProperties = {
    color: '#9FDCC4',
    textDecoration: 'underline',
    fontSize: 12,
    fontFamily: 'JetBrains Mono, monospace',
    letterSpacing: 0.5,
  };

  const swapBtn: CSSProperties = {
    marginLeft: 12,
    background: 'rgba(168,155,126,0.18)',
    border: '1px solid rgba(168,155,126,0.5)',
    color: '#E6EFFF',
    padding: '3px 10px',
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: '"Noto Serif SC", serif',
    cursor: 'pointer',
    borderRadius: 2,
  };

  const ipFooter: CSSProperties = {
    marginTop: 22,
    paddingTop: 14,
    borderTop: '1px solid rgba(168,155,126,0.2)',
    fontSize: 9,
    fontStyle: 'italic',
    color: 'rgba(230,239,255,0.5)',
    letterSpacing: 0.4,
  };

  const titleStyle: CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: 6,
    marginBottom: 4,
  };

  const subtitle: CSSProperties = {
    fontSize: 10,
    letterSpacing: 4,
    color: '#9FB6D6',
    fontFamily: 'JetBrains Mono, monospace',
    marginBottom: 14,
  };

  return (
    <div
      data-testid="tech-details-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tech-details-title"
      style={backdrop}
      onClick={onClose}
    >
      <div
        style={card}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          data-testid="tech-details-close"
          aria-label="回到小镇"
          onClick={onClose}
          style={closeBtn}
        >
          ←&nbsp;回到小镇
        </button>

        <h2 id="tech-details-title" style={{ ...titleStyle, margin: 0 }}>告示牌</h2>
        <div style={subtitle}>SIGNPOST · TECH DETAILS</div>

        <div data-testid="section-overview">
          <div style={sectionHeading}>项目简介</div>
          <div style={bodyText}>
            看山书房 是一个面向 知乎 答主 的多智能体工作台，覆盖 灵感激发 → 思路梳理 → 内容精加工 三个阶段。九只狐狸各执其能，看山 唯予所欲。
          </div>
        </div>

        <div data-testid="section-stack">
          <div style={sectionHeading}>技术栈</div>
          <div style={{ ...bodyText, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: 0.4 }}>
            {TECH_STACK}
          </div>
        </div>

        <div data-testid="section-credits">
          <div style={sectionHeading}>设计 &amp; 开发</div>
          <div style={bodyText}>
            Solo build · Claude Code as engine · 知乎 Hackathon 2026
          </div>
        </div>

        <div data-testid="section-repo">
          <div style={sectionHeading}>仓库链接</div>
          <a
            data-testid="tech-details-repo-link"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
          >
            {REPO_URL}
          </a>
        </div>

        <div data-testid="section-key">
          <div style={sectionHeading}>你的密钥状态</div>
          <div style={{ ...bodyText, display: 'flex', alignItems: 'center' }}>
            <span data-testid="tech-details-mode">{modeLabel}</span>
            <button
              data-testid="tech-details-swap-key"
              onClick={handleSwapKey}
              style={swapBtn}
            >
              更换密钥
            </button>
          </div>
        </div>

        <div data-testid="tech-details-attribution" style={ipFooter}>
          {shan.attribution}
        </div>
      </div>
    </div>
  );
}
