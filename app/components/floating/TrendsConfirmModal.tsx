'use client';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'kanshan-trends-acknowledged';
// Acknowledgement is valid for 24h; simpler than juggling sessionStorage + localStorage.
const ACK_TTL_MS = 24 * 60 * 60 * 1000;

export function isTrendsAcknowledged(): boolean {
  if (typeof window === 'undefined') return false;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const ts = Date.parse(raw);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < ACK_TTL_MS;
}

export function markTrendsAcknowledged(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
}

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TrendsConfirmModal({ open, onConfirm, onCancel }: Props) {
  const [checked, setChecked] = useState(false);

  // Reset checkbox each time the modal opens.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setChecked(false);
  }, [open]);

  // ESC key cancels.
  useEffect(() => {
    if (!open) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const root: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 3500,
    background: 'rgba(20,22,30,0.78)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Noto Serif SC", serif',
  };

  const card: CSSProperties = {
    background: 'rgba(250,248,243,0.98)',
    border: '1px solid rgba(168,155,126,0.35)',
    borderRadius: 4,
    padding: 28,
    maxWidth: 480,
    width: 'calc(100% - 48px)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
  };

  const heading: CSSProperties = {
    fontSize: 20,
    color: '#2A2419',
    fontFamily: '"Noto Serif SC", serif',
    marginBottom: 6,
  };

  const subheading: CSSProperties = {
    fontSize: 10,
    letterSpacing: 4,
    color: '#7A6F5A',
    fontFamily: 'JetBrains Mono, monospace',
    marginBottom: 16,
  };

  const bodyText: CSSProperties = {
    fontSize: 14,
    color: '#3A3225',
    lineHeight: 1.8,
    fontFamily: '"Noto Serif SC", serif',
    marginBottom: 16,
  };

  const checkboxRow: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    cursor: 'pointer',
    userSelect: 'none',
  };

  const checkboxLabel: CSSProperties = {
    fontSize: 12,
    color: '#3A3225',
    fontFamily: '"Noto Serif SC", serif',
  };

  const buttonRow: CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
  };

  const cancelButton: CSSProperties = {
    padding: '8px 16px',
    background: 'transparent',
    color: '#2A2419',
    border: '1px solid rgba(168,155,126,0.55)',
    borderRadius: 2,
    fontFamily: '"Noto Serif SC", serif',
    fontSize: 12,
    letterSpacing: 2,
    cursor: 'pointer',
  };

  const confirmButton: CSSProperties = {
    padding: '8px 16px',
    background: checked ? '#2A2419' : 'rgba(42,36,25,0.35)',
    color: '#FAF8F3',
    border: `1px solid ${checked ? '#2A2419' : 'rgba(42,36,25,0.35)'}`,
    borderRadius: 2,
    fontFamily: '"Noto Serif SC", serif',
    fontSize: 12,
    letterSpacing: 2,
    cursor: checked ? 'pointer' : 'not-allowed',
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      data-testid="trends-confirm-backdrop"
      style={root}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        data-testid="trends-confirm-modal"
        style={card}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={heading}>稍等一步</div>
        <div style={subheading}>看势 · 红线提示</div>
        <div data-testid="trends-confirm-body" style={bodyText}>
          看势是看山的小镇，热度是用来选题的，不是用来扩写的。本次只是参考一眼，对吗？
        </div>
        <label style={checkboxRow}>
          <input
            data-testid="trends-confirm-checkbox"
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span style={checkboxLabel}>我明白本次只用于选题灵感</span>
        </label>
        <div style={buttonRow}>
          <button
            type="button"
            data-testid="trends-confirm-cancel"
            style={cancelButton}
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            data-testid="trends-confirm-confirm"
            style={confirmButton}
            disabled={!checked}
            onClick={() => {
              if (checked) onConfirm();
            }}
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
