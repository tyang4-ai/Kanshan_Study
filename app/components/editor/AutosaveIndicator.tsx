'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useEditorTabsStore, selectActiveDoc } from '@/lib/store/editor-tabs';

/**
 * Renders the live autosave status next to the tab strip.
 *
 * Replaces the hardcoded "已自动保存 · 16:42" string with a real, ticking
 * relative-time label sourced from the active tab's `lastSavedAt`.
 */
export function AutosaveIndicator() {
  const lastSavedAt = useEditorTabsStore((s) => selectActiveDoc(s)?.lastSavedAt ?? 0);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);

  const label = formatRelative(lastSavedAt, now);

  const outerStyle: CSSProperties = {
    padding: '0 10px',
    fontSize: 11,
    color: '#7A6655',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  };
  const dotStyle: CSSProperties = {
    display: 'inline-block',
    width: 6,
    height: 6,
    borderRadius: 3,
    background: lastSavedAt > 0 ? '#2ECC71' : 'rgba(122,102,85,0.3)',
  };

  // Compact label: drop the verbose 「已自动保存 · 」prefix from the visible
  // text — the dot + tooltip carry that meaning. Saves ~80px of horizontal
  // real estate in the tab strip.
  return (
    <div data-testid="autosave-indicator" style={outerStyle} title={`已自动保存 · ${label}`}>
      <span aria-hidden style={dotStyle} />
      <span>{label}</span>
    </div>
  );
}

/** Public for tests. */
export function formatRelative(savedAt: number, now: number): string {
  if (savedAt <= 0) return '从未保存';
  const diff = Math.max(0, now - savedAt);
  if (diff < 8_000) return '刚刚';
  if (diff < 60_000) return `${Math.floor(diff / 1000)} 秒前`;
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 24 * 60 * 60_000) return `${Math.floor(diff / (60 * 60_000))} 小时前`;
  return `${Math.floor(diff / (24 * 60 * 60_000))} 天前`;
}

export default AutosaveIndicator;
