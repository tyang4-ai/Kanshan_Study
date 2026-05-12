'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { useLastVisitStore, isWithinReturnWindow } from '@/lib/store/last-visit';
import { FOX_BY_ID } from '@/lib/foxes/registry';

// R2 judge fix (李笛 P0 2026-05-12): the "关浏览器一周后回来狐狸还记得他吗"
// surface. Reads `kanshan-last-visit` from localStorage. If the 答主 visited
// between 4h and 30d ago AND hasn't dismissed in this session, shows a
// contextual bubble naming the last file + topic snippet. One-tap dismiss.
//
// localStorage means the bubble survives browser restarts on the same device.
// Cross-device is post-MVP (Supabase table backing the same shape).

export function ReturningVisitorBubble() {
  const lastFilename = useLastVisitStore((s) => s.lastFilename);
  const lastTopicSnippet = useLastVisitStore((s) => s.lastTopicSnippet);
  const lastVisitAt = useLastVisitStore((s) => s.lastVisitAt);
  const dismissed = useLastVisitStore((s) => s.dismissed);
  const dismiss = useLastVisitStore((s) => s.dismiss);
  // Defer the visibility check to a client effect so SSR + hydration don't
  // produce a flash; persist middleware rehydrates from localStorage on mount.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  if (!ready || dismissed) return null;
  if (!isWithinReturnWindow(lastVisitAt)) return null;
  if (!lastFilename) return null;

  const dian = FOX_BY_ID.dian; // 看典 is the memory keeper — accent in its glow.
  const elapsedLabel = formatElapsed(lastVisitAt);

  return (
    <div
      data-testid="returning-visitor-bubble"
      role="status"
      aria-live="polite"
      style={bubbleStyle(dian.glow)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div
          aria-hidden
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            background: dian.glow,
            boxShadow: `0 0 10px ${dian.glow}88`,
            marginTop: 5,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={titleStyle}>
            看典 · 还记得这条线索
          </div>
          <div style={bodyStyle}>
            上次（{elapsedLabel}）你在写《{lastFilename}》
            {lastTopicSnippet ? <>，关于「{lastTopicSnippet}…」。</> : '。'}
            要继续吗？
          </div>
        </div>
        <button
          type="button"
          data-testid="returning-visitor-bubble-dismiss"
          aria-label="关闭"
          onClick={dismiss}
          style={dismissStyle}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function formatElapsed(visitedAt: number | null): string {
  if (visitedAt == null) return '';
  const diff = Date.now() - visitedAt;
  const h = Math.floor(diff / (60 * 60 * 1000));
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (d < 7) return `${d} 天前`;
  if (d < 30) return `${Math.floor(d / 7)} 周前`;
  return `${Math.floor(d / 30)} 个月前`;
}

const bubbleStyle = (glow: string): CSSProperties => ({
  position: 'fixed',
  right: 16,
  bottom: 88,
  zIndex: 1400,
  maxWidth: 320,
  padding: '12px 14px',
  background: 'rgba(26,31,42,0.94)',
  backdropFilter: 'blur(10px)',
  border: `1px solid ${glow}88`,
  borderRadius: 8,
  boxShadow: `0 8px 28px rgba(0,0,0,0.4), 0 0 18px ${glow}33`,
  color: '#E8DCC4',
  fontFamily: '"Noto Sans SC", sans-serif',
  fontSize: 12,
  lineHeight: 1.55,
});

const titleStyle: CSSProperties = {
  fontSize: 11,
  fontFamily: '"Noto Serif SC", serif',
  color: '#C0B294',
  letterSpacing: 1,
  fontWeight: 600,
  marginBottom: 4,
};

const bodyStyle: CSSProperties = {
  fontSize: 11.5,
  color: '#E8DCC4',
  fontFamily: '"Noto Sans SC", sans-serif',
};

const dismissStyle: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#8FA1B6',
  cursor: 'pointer',
  fontSize: 16,
  padding: 0,
  width: 18,
  lineHeight: 1,
  flexShrink: 0,
};
