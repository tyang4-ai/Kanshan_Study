'use client';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useProvenanceStore, type ProvenanceKind } from '@/lib/store/provenance';

const wrapperStyle: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-end',
  gap: 12,
  padding: '32px 0 18px',
  background:
    'linear-gradient(to bottom, rgba(250,248,243,0) 0%, rgba(250,248,243,0.92) 55%, #FAF8F3 100%)',
  pointerEvents: 'none',
};

const stampStyle: CSSProperties = {
  fontFamily: 'JetBrains Mono, "Noto Sans SC", sans-serif',
  fontSize: 10.5,
  color: '#7A6655',
  letterSpacing: 0.6,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  // Demo-flow judge persona-review 2026-05-11 P1: the stamp must be
  // clickable so the demo's "看心 click → drawer" beat (script 2:15-2:35)
  // actually does something. pointerEvents goes back to auto on the inner
  // button; the surrounding gradient wrapper stays pointer-transparent.
  pointerEvents: 'auto',
  background: 'transparent',
  border: '1px solid rgba(122, 102, 85, 0.25)',
  borderRadius: 999,
  padding: '4px 12px',
  cursor: 'pointer',
  transition: 'background 0.15s, border-color 0.15s',
};

const sepStyle: CSSProperties = { opacity: 0.5 };
const timeStyle: CSSProperties = { opacity: 0.7 };

const drawerStyle: CSSProperties = {
  position: 'absolute',
  bottom: 56,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'min(640px, 90%)',
  maxHeight: 'min(60vh, 460px)',
  overflowY: 'auto',
  pointerEvents: 'auto',
  background: '#FFFCF4',
  border: '1px solid rgba(122, 102, 85, 0.35)',
  borderRadius: 6,
  boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
  padding: '14px 18px 16px',
  fontFamily: '"Noto Serif SC", serif',
  fontSize: 12,
  lineHeight: 1.7,
  color: '#1A1F2A',
};

function formatTime(d: Date): string {
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

interface ComplianceClause {
  kind: ProvenanceKind;
  label: string;
  desc: string;
}

const CLAUSES: ComplianceClause[] = [
  { kind: 'hedge', label: '声明软化', desc: '医学/法律/财务等高风险断言由 看心 软化措辞，标注 hedge 下划线。' },
  { kind: 'flagged', label: '出处待补', desc: '缺失可溯源 url / 文献 的断言被 看心 标红，等答主补出处后才允许发布。' },
  { kind: 'ai-touched', label: 'AI 协作段落', desc: '看墨 / 看水 / 看典 重写过的段落均挂 ai-touched 标识，符合 GB 45438-2025。' },
  { kind: 'sourced', label: '可溯引用', desc: '三种引用 (web 蓝圈 / vault 棕方 / zhihu 红章) 全部可点击溯源。' },
  { kind: 'claim', label: '医学声明', desc: '看心 标记的医学/疗效断言；建议附医生联系或免责。' },
];

const FOOTER_LINES = [
  '关键链路只用 Kimi / DeepSeek (国产已备案) — 自愿选境内，不是规则要求。',
  '输出双标识符合 GB 45438-2025，AI 协作可追溯。',
  '不训练答主内容；档案库不入第三方训练集。',
  '引用全部实时检索 · 可点击溯源 · 不做热点自动扩写。',
];

export function ComplianceStamp() {
  const entries = useProvenanceStore((s) => s.entries);
  const counts = useMemo(() => {
    const c: Record<ProvenanceKind, number> = {
      'ai-touched': 0,
      claim: 0,
      hedge: 0,
      sourced: 0,
      flagged: 0,
    };
    for (const e of entries) c[e.kind]++;
    return c;
  }, [entries]);

  const items: string[] = [];
  if (counts.hedge > 0) items.push(`${counts.hedge} 处声明软化`);
  if (counts.flagged > 0) items.push(`${counts.flagged} 处出处待补`);
  if (counts['ai-touched'] > 0) items.push(`${counts['ai-touched']} 处 AI 协作段落`);
  if (counts.sourced > 0) items.push(`${counts.sourced} 处可溯引用`);
  if (counts.claim > 0) items.push(`${counts.claim} 处医学声明`);

  const hasItems = items.length > 0;
  const [time, setTime] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // SSR snapshot must omit time to avoid hydration mismatch with client clock.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTime(formatTime(new Date()));
    const id = setInterval(() => setTime(formatTime(new Date())), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div style={wrapperStyle} data-testid="compliance-stamp">
      <button
        type="button"
        data-testid="compliance-stamp-button"
        aria-label="展开 看心 合规审计明细"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(122, 102, 85, 0.06)';
          e.currentTarget.style.borderColor = 'rgba(122, 102, 85, 0.45)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'rgba(122, 102, 85, 0.25)';
        }}
        style={stampStyle}
      >
        <span>{hasItems ? '看心 · 已审' : '看心 · 待审'}</span>
        {items.map((it) => (
          <span key={it} style={{ display: 'contents' }}>
            <span style={sepStyle}>·</span>
            <span>{it}</span>
          </span>
        ))}
        {time && (
          <>
            <span style={sepStyle}>·</span>
            <span style={timeStyle} suppressHydrationWarning>{time}</span>
          </>
        )}
        <span style={{ marginLeft: 4, opacity: 0.5, fontSize: 9 }} aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div role="dialog" aria-label="看心 合规审计" data-testid="compliance-stamp-drawer" style={drawerStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: '1px solid rgba(122, 102, 85, 0.22)',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: 1 }}>看心 · 本稿审计明细</div>
            <button
              type="button"
              aria-label="关闭"
              onClick={() => setOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#7A6655',
                fontSize: 14,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {CLAUSES.map((c) => {
              const n = counts[c.kind];
              return (
                <div key={c.kind} style={{ display: 'flex', gap: 10 }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 64,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10.5,
                      color: n > 0 ? '#1F8B66' : '#7A6655',
                      letterSpacing: 0.4,
                    }}
                  >
                    {n} 处
                  </span>
                  <span style={{ flexShrink: 0, width: 88, fontWeight: 600, fontSize: 11.5 }}>{c.label}</span>
                  <span style={{ flex: 1, fontSize: 11.5, color: '#3A3633' }}>{c.desc}</span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(122, 102, 85, 0.22)',
              paddingTop: 8,
              fontSize: 10.5,
              color: '#5A6270',
              lineHeight: 1.6,
            }}
          >
            <div style={{ marginBottom: 4, fontWeight: 600, color: '#7A6655', letterSpacing: 0.5 }}>合规承诺</div>
            <ul style={{ listStyle: 'disc', paddingLeft: 16, margin: 0 }}>
              {FOOTER_LINES.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplianceStamp;
