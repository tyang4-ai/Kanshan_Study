'use client';
import type { CSSProperties } from 'react';
import { useState } from 'react';

const STORAGE_KEY = 'kanshan-onboarding';
const TOUR_KEY = 'kanshan-tour-done';

type OnboardingMode = 'byo-key' | 'guest';

interface OnboardingRecord {
  mode: OnboardingMode;
  apiKey?: string;
  dismissedAt: string;
}

function readRecord(): OnboardingRecord | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OnboardingRecord;
    if (parsed.mode !== 'byo-key' && parsed.mode !== 'guest') return null;
    return parsed;
  } catch {
    return null;
  }
}

function maskKey(key: string): string {
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}•••${key.slice(-3)}`;
}

export function ApiKeyInput() {
  // Lazy initializer reads localStorage exactly once at first render to avoid
  // the useEffect+setState cascading-render lint rule.
  const [record, setRecord] = useState<OnboardingRecord | null>(readRecord);

  const reopenGate = () => {
    if (typeof window === 'undefined') return;
    const ok = window.confirm('将清除当前模式设置并重新进入引导，是否继续？');
    if (!ok) return;
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(TOUR_KEY);
    setRecord(null);
    window.location.reload();
  };

  const wrap: CSSProperties = {
    padding: 14,
    border: '1px solid rgba(168,155,126,0.35)',
    borderRadius: 2,
    background: 'rgba(250,248,243,0.6)',
    fontFamily: '"Noto Serif SC", serif',
    color: '#2A2419',
  };

  const statusLine: CSSProperties = {
    fontSize: 12,
    color: '#3A3225',
    marginBottom: 10,
    fontFamily: 'JetBrains Mono, monospace',
    letterSpacing: 1,
  };

  const buttonStyle: CSSProperties = {
    padding: '8px 12px',
    background: '#2A2419',
    color: '#FAF8F3',
    border: '1px solid #2A2419',
    borderRadius: 2,
    fontFamily: '"Noto Serif SC", serif',
    fontSize: 12,
    letterSpacing: 2,
    cursor: 'pointer',
  };

  const mode = record?.mode ?? 'guest';
  const guestHash = '—';
  const apiKeyDisplay =
    record?.mode === 'byo-key' && record.apiKey ? maskKey(record.apiKey) : '—';
  const buttonLabel = mode === 'byo-key' ? '更换密钥' : '升级到自带密钥';

  return (
    <div data-testid="api-key-input" style={wrap}>
      <div data-testid="api-key-status" style={statusLine}>
        mode: {mode} · key: {apiKeyDisplay} · guest hash: {guestHash}
      </div>
      <button
        type="button"
        data-testid="api-key-reopen"
        style={buttonStyle}
        onClick={reopenGate}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
