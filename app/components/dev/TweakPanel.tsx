'use client';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useTweakStore } from '@/lib/store/tweak';
import { TWEAK_DEFS, TWEAK_GROUPS, type TweakDef } from '@/lib/tweak/manifest';

const POS_KEY = 'kanshan-tweak-panel-pos';
const DEFAULT_W = 320;
const MARGIN = 12;

function loadPos(): { x: number; y: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { x: number; y: number };
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function clampPos(p: { x: number; y: number }, width: number, height: number): { x: number; y: number } {
  if (typeof window === 'undefined') return p;
  const maxX = Math.max(0, window.innerWidth - width);
  const maxY = Math.max(0, window.innerHeight - height);
  return {
    x: Math.min(Math.max(0, p.x), maxX),
    y: Math.min(Math.max(0, p.y), maxY),
  };
}

// Phase #16.6 — dev-time tweaker. Mounts only when ?tweak=1 in the URL.
// Sliders for every TWEAK_DEF entry; "Copy JSON" dumps the active values
// so the user can paste them back to source. Production builds never see
// this component (the URL flag check renders null otherwise).

export function TweakPanel() {
  const [enabled, setEnabled] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const values = useTweakStore((s) => s.values);
  const setTweak = useTweakStore((s) => s.setTweak);
  const reset = useTweakStore((s) => s.reset);
  const resetAll = useTweakStore((s) => s.resetAll);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('tweak') === '1';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(flag);
    if (flag) {
      const stored = loadPos();
      const initial = stored ?? {
        x: window.innerWidth - DEFAULT_W - MARGIN,
        y: MARGIN,
      };
      setPos(clampPos(initial, DEFAULT_W, 600));
    }
  }, []);

  // Drag handlers — captured at window level so the pointer can leave the
  // header without the move getting lost. We use pointer events (not mouse)
  // so touch-screens work too.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent): void => {
      const off = dragOffsetRef.current;
      if (!off) return;
      const next = clampPos(
        { x: e.clientX - off.dx, y: e.clientY - off.dy },
        panelRef.current?.offsetWidth ?? DEFAULT_W,
        panelRef.current?.offsetHeight ?? 600,
      );
      setPos(next);
      // Persist on every move — cheap, avoids the stale-state race that hits
      // when reading from getBoundingClientRect() in pointerup before React
      // has had a chance to re-render the new transform.
      try {
        window.localStorage.setItem(POS_KEY, JSON.stringify(next));
      } catch {
        /* quota / disabled — ignore */
      }
    };
    const onUp = (): void => {
      setDragging(false);
      dragOffsetRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging]);

  if (!enabled) return null;

  const onHeaderPointerDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    // Ignore drag-start when the pointer is on an actual button (chevron /
    // Copy JSON / Reset all). Buttons keep their click semantics.
    if ((e.target as HTMLElement).closest('button')) return;
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragOffsetRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    setDragging(true);
    e.preventDefault();
  };

  const handleCopy = async () => {
    const json = JSON.stringify(values, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // some browsers gate clipboard on https only; fall back to log
      console.log('[TweakPanel] values:', json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }
  };

  const groupedDefs = TWEAK_DEFS.reduce<Record<string, TweakDef[]>>((acc, def) => {
    (acc[def.group] ||= []).push(def);
    return acc;
  }, {});

  const panelStyle: CSSProperties = {
    ...PANEL,
    ...(pos
      ? { top: pos.y, left: pos.x, right: 'auto' }
      : { top: MARGIN, right: MARGIN }),
    userSelect: dragging ? 'none' : undefined,
  };
  const headerStyle: CSSProperties = {
    ...HEADER,
    cursor: dragging ? 'grabbing' : 'grab',
  };

  return (
    <div ref={panelRef} data-testid="tweak-panel" style={panelStyle}>
      <div style={headerStyle} onPointerDown={onHeaderPointerDown}>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          style={CHEVRON}
          aria-label={collapsed ? '展开 tweaker' : '折叠 tweaker'}
        >
          {collapsed ? '▸' : '▾'}
        </button>
        <span style={TITLE}>tweaker · ?tweak=1</span>
        <button type="button" onClick={handleCopy} style={ACTION_BTN}>
          {copied ? '✓ 已复制' : '📋 Copy JSON'}
        </button>
        <button type="button" onClick={resetAll} style={ACTION_BTN}>
          ↺ Reset all
        </button>
      </div>
      {!collapsed && (
        <div style={BODY}>
          {Object.entries(groupedDefs).map(([group, defs]) => (
            <div key={group} style={GROUP}>
              <div style={GROUP_HEADER}>
                {TWEAK_GROUPS[group as TweakDef['group']]}
              </div>
              {defs.map((def) => {
                const current = values[def.id] ?? def.defaultValue;
                const touched = def.id in values;
                return (
                  <div key={def.id} style={ROW}>
                    <div style={LABEL_ROW}>
                      <span style={LABEL}>{def.label}</span>
                      <span style={{ ...VALUE, color: touched ? '#FFC857' : '#8FA1B6' }}>
                        {def.format ? def.format(current) : current.toFixed(2)}
                      </span>
                      {touched && (
                        <button
                          type="button"
                          onClick={() => reset(def.id)}
                          style={RESET_BTN}
                          aria-label={`reset ${def.id}`}
                        >
                          ↺
                        </button>
                      )}
                    </div>
                    <input
                      type="range"
                      min={def.min}
                      max={def.max}
                      step={def.step}
                      value={current}
                      onChange={(e) => setTweak(def.id, Number(e.target.value))}
                      style={SLIDER}
                      data-testid={`tweak-slider-${def.id}`}
                    />
                    <div style={SLIDER_BOUNDS}>
                      <span>{def.format ? def.format(def.min) : def.min}</span>
                      <span>{def.format ? def.format(def.max) : def.max}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PANEL: CSSProperties = {
  position: 'fixed',
  top: 12,
  right: 12,
  width: 320,
  maxHeight: 'calc(100vh - 24px)',
  overflowY: 'auto',
  background: 'rgba(20, 24, 32, 0.94)',
  backdropFilter: 'blur(10px)',
  color: '#E8EEF5',
  borderRadius: 8,
  boxShadow: '0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
  zIndex: 9999,
  fontFamily: '"Noto Sans SC", system-ui, sans-serif',
  fontSize: 12,
};

const HEADER: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  position: 'sticky',
  top: 0,
  background: 'rgba(20, 24, 32, 0.96)',
};

const CHEVRON: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#8FA1B6',
  cursor: 'pointer',
  fontSize: 12,
  padding: 0,
  width: 16,
};

const TITLE: CSSProperties = {
  flex: 1,
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: 10.5,
  letterSpacing: 0.6,
  color: '#8FA1B6',
};

const ACTION_BTN: CSSProperties = {
  fontSize: 10.5,
  padding: '3px 8px',
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.05)',
  color: '#E8EEF5',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const BODY: CSSProperties = {
  padding: '6px 10px 10px',
};

const GROUP: CSSProperties = {
  marginTop: 8,
};

const GROUP_HEADER: CSSProperties = {
  fontSize: 10,
  letterSpacing: 1,
  color: '#8FA1B6',
  textTransform: 'uppercase',
  margin: '6px 0 4px',
  fontFamily: '"JetBrains Mono", monospace',
};

const ROW: CSSProperties = {
  padding: '4px 0',
};

const LABEL_ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 2,
};

const LABEL: CSSProperties = { flex: 1, fontSize: 11.5, color: '#E8EEF5' };

const VALUE: CSSProperties = {
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: 10.5,
  minWidth: 44,
  textAlign: 'right',
};

const RESET_BTN: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#8FA1B6',
  cursor: 'pointer',
  fontSize: 11,
  padding: 0,
  width: 14,
  lineHeight: 1,
};

const SLIDER: CSSProperties = {
  width: '100%',
  accentColor: '#FFC857',
};

const SLIDER_BOUNDS: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 9,
  color: '#5A6B80',
  fontFamily: '"JetBrains Mono", monospace',
  marginTop: 1,
};
