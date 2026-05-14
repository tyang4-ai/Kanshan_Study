'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { useCorkboardStore, type CorkboardPin } from '@/lib/store/corkboard';
import { withGridPositions } from '@/lib/corkboard/layout';
import { Pushpin } from '@/components/atoms/Pushpin';

// R6 demo-flow review (Tan Shulin) P1: corkboard cold-load showed
// "空板，点右上 + 写一张便签…" on a fresh browser because the persisted
// store starts at pins:[] with no demo content. Pre-seed once on first
// mount so the 0:00 cold-open beat has visible working-memory cards.
// The localStorage flag below ensures the seed runs at most once per
// browser — if the user clears all their cards, we don't refill them.
// Bumped to v2 on 2026-05-13 — the v1 seed had 影像组学 sticky notes from the
// pre-pivot demo iteration; users with v1 set keep seeing stale content until
// they manually wipe localStorage. v2 forces a re-seed with the new GBM notes.
const SEED_FLAG = 'kanshan-corkboard-seeded-v2';
const STALE_SEED_FLAGS = ['kanshan-corkboard-seeded'];
const DEMO_SEED = [
  { annotation: '调研一下 TTFields 医保覆盖 — 看势热榜 #02 有信息点', createdBy: 'user' as const },
  { annotation: '今天咨询后补一段治疗选择对话（按 看墨 调一道再发）', createdBy: 'user' as const },
  { annotation: '看典 D-12 「MGMT 甲基化速查」引用待补', createdBy: 'kanshan' as const },
];

const VAULT_DRAG_MIME = 'application/kanshan-vault';

interface CorkboardProps {
  width: number;
  height: number;
  searchOpen: boolean;
  postitOpen: boolean;
  onCloseSearch: () => void;
  onClosePostit: () => void;
}

interface VaultDragPayload {
  id: string;
  title: string;
  snippet?: string;
  year?: string;
  tags?: string[];
  spine?: string;
}

export function Corkboard({
  width,
  height,
  searchOpen,
  postitOpen,
  onCloseSearch,
  onClosePostit,
}: CorkboardProps) {
  const pins = useCorkboardStore((s) => s.pins);
  const addPin = useCorkboardStore((s) => s.addPin);
  const addPostit = useCorkboardStore((s) => s.addPostit);
  const removePin = useCorkboardStore((s) => s.removePin);
  const movePin = useCorkboardStore((s) => s.movePin);
  const updateAnnotation = useCorkboardStore((s) => s.updateAnnotation);
  const bringToFront = useCorkboardStore((s) => s.bringToFront);

  const [filter, setFilter] = useState('');
  const [postitDraft, setPostitDraft] = useState('');
  const [composing, setComposing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // The zustand-persist v1→v2 migration in lib/store/corkboard.ts already
      // strips radiogenomics-era pins on rehydrate, so we don't need to
      // filter here — just decide whether to seed the GBM pins.
      // Seed if either: (a) v2 SEED_FLAG isn't set yet, OR (b) v1 was set but
      // the migration left the board empty (returning user pre-pivot).
      const seededV2 = window.localStorage.getItem(SEED_FLAG) === '1';
      const hadLegacyFlag = STALE_SEED_FLAGS.some((k) => window.localStorage.getItem(k));
      if (seededV2 && pins.length > 0) return;
      // Clear legacy flags so future versions can detect a fresh upgrade.
      for (const k of STALE_SEED_FLAGS) window.localStorage.removeItem(k);
      if (pins.length === 0) {
        for (const p of DEMO_SEED) addPostit(p.annotation, p.createdBy);
      }
      window.localStorage.setItem(SEED_FLAG, '1');
      // Suppress unused warning when legacy flag wasn't set yet (fresh visitor).
      void hadLegacyFlag;
    } catch {
      /* localStorage blocked — accept the cold-open hit */
    }
  }, [pins.length, addPostit]);

  // Vertical scroll past N=12 — see plan #13.99 Task C "Auto-size strategy".
  const scrollEnabled = pins.length > 12;

  // R2 code-quality (Wei Zhang) P2: useMemo so we don't recompute the grid
  // + filter + sort on every render. bringToFront mutates `pins` order so
  // the dependency list is correct; width changes are rare.
  const positioned = useMemo(() => withGridPositions(pins, width), [pins, width]);
  // When search panel is hidden, treat filter as empty regardless of stale
  // state. This avoids needing setState-in-effect to reset on close.
  const activeFilter = searchOpen ? filter : '';
  const visiblePins = useMemo(() => {
    const f = activeFilter.toLowerCase();
    const filtered = activeFilter
      ? positioned.filter(
          (p) =>
            (p.content.title ?? '').toLowerCase().includes(f) ||
            (p.content.snippet ?? '').toLowerCase().includes(f) ||
            (p.content.annotation ?? '').toLowerCase().includes(f),
        )
      : positioned;
    // Layering: post-it notes always render above other pins (judges/users
    // most often want hand-written annotations on top). Within each group,
    // array order = z-order, which the store's bringToFront keeps fresh on
    // click. Stable sort via index keeps positions deterministic.
    return [
      ...filtered.filter((p) => p.kind !== 'note'),
      ...filtered.filter((p) => p.kind === 'note'),
    ];
  }, [positioned, activeFilter]);

  const closeSearchAndReset = () => {
    setFilter('');
    onCloseSearch();
  };
  const closePostitAndReset = () => {
    setPostitDraft('');
    onClosePostit();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(VAULT_DRAG_MIME);
    if (!raw) return; // foreign MIME — reject silently
    try {
      const payload = JSON.parse(raw) as VaultDragPayload;
      const rect = containerRef.current?.getBoundingClientRect();
      const x = rect ? Math.max(0, e.clientX - rect.left - 90) : undefined;
      const y = rect ? Math.max(0, e.clientY - rect.top - 60) : undefined;
      addPin({
        kind: 'vault',
        sourceId: payload.id,
        x,
        y,
        w: 180,
        h: 120,
        content: { title: payload.title, snippet: payload.snippet },
        createdBy: 'user',
      });
    } catch {
      // malformed payload — ignore
    }
  };

  const handlePinDragStart = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/kanshan-pin-id', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePinDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('application/kanshan-pin-id');
    if (!id) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, e.clientX - rect.left - 90);
    const y = Math.max(0, e.clientY - rect.top - 60);
    movePin(id, x, y, { w: width, h: height });
  };

  const submitPostit = () => {
    const text = postitDraft.trim();
    if (!text) {
      closePostitAndReset();
      return;
    }
    addPostit(text, 'user');
    closePostitAndReset();
  };

  const containerStyle: CSSProperties = {
    position: 'absolute',
    top: 32,
    left: 0,
    right: 0,
    // Bottom 9-fox dock was removed Y8-P2b (2026-05-11, see LeftRail.tsx
    // header); the previous `bottom: 280` left the lower 280px of the cork
    // unreachable by drop/move handlers. Now stretches to the full surface.
    bottom: 0,
    overflowY: scrollEnabled ? 'auto' : 'hidden',
    overflowX: 'hidden',
  };

  const innerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    minHeight: '100%',
  };

  return (
    <div
      ref={containerRef}
      data-testid="corkboard"
      style={containerStyle}
      onDrop={(e) => {
        // Try vault MIME first, then pin reposition
        if (e.dataTransfer.types.includes(VAULT_DRAG_MIME)) {
          handleDrop(e);
        } else if (e.dataTransfer.types.includes('application/kanshan-pin-id')) {
          handlePinDrop(e);
        }
      }}
      onDragOver={(e) => {
        if (
          e.dataTransfer.types.includes(VAULT_DRAG_MIME) ||
          e.dataTransfer.types.includes('application/kanshan-pin-id')
        ) {
          e.preventDefault();
          e.dataTransfer.dropEffect = e.dataTransfer.types.includes(VAULT_DRAG_MIME) ? 'copy' : 'move';
        }
      }}
    >
      <div style={innerStyle}>
        {/* Search bar (shown when active) */}
        {searchOpen && (
          <div
            data-testid="corkboard-search-bar"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 40,
              padding: '6px 12px',
              background: 'rgba(250,246,236,0.92)',
              borderBottom: '1px solid rgba(120,90,60,.16)',
              backdropFilter: 'blur(2px)',
            }}
          >
            <input
              data-testid="corkboard-search-input"
              autoFocus
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  closeSearchAndReset();
                }
              }}
              placeholder="过滤板上内容…"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 12,
                fontFamily: '"Noto Sans SC", sans-serif',
                color: '#1A1F2A',
                padding: '4px 0',
              }}
            />
          </div>
        )}

        {/* Empty state */}
        {visiblePins.length === 0 && (
          <div
            data-testid="corkboard-empty"
            style={{
              position: 'absolute',
              top: '40%',
              left: 0,
              right: 0,
              textAlign: 'center',
              fontSize: 11,
              color: 'rgba(26,31,42,0.62)',
              fontFamily: '"Noto Serif SC", serif',
              padding: '0 16px',
              pointerEvents: 'none',
            }}
          >
            {filter
              ? '未找到匹配的卡片'
              : '空板。点右上 + 写一张便签，或从档案库拖拽过来，或让看山钉点东西上去。'}
          </div>
        )}

        {/* Pins */}
        {visiblePins.map((pin) => (
          <PinView
            key={pin.id}
            pin={pin}
            onDragStart={handlePinDragStart(pin.id)}
            onRemove={() => removePin(pin.id)}
            onAnnotationChange={(text) => updateAnnotation(pin.id, text)}
            onFocus={() => bringToFront(pin.id)}
          />
        ))}

        {/* Post-it composer (sticky to bottom of corkboard when active).
            Persona-fix #6 (2026-05-09 小杨 review): Enter sometimes lost the
            pin if the textarea blurred mid-keypress. Now: explicit "保存" button
            is the primary save affordance + onBlur commits any non-empty draft
            so a click outside the composer can no longer discard work. */}
        {postitOpen && (
          <div
            data-testid="corkboard-postit-composer"
            style={{
              position: 'sticky',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 50,
              padding: 10,
              background: 'rgba(250,246,236,0.95)',
              borderTop: '1px solid rgba(120,90,60,.18)',
              backdropFilter: 'blur(2px)',
            }}
          >
            <textarea
              data-testid="corkboard-postit-input"
              autoFocus
              value={postitDraft}
              onChange={(e) => setPostitDraft(e.target.value)}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={() => setComposing(false)}
              onBlur={() => {
                // Commit-on-blur: if user clicks away with text in the buffer,
                // save it instead of discarding. Empty drafts are a no-op via
                // submitPostit's own guard.
                if (postitDraft.trim()) submitPostit();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  closePostitAndReset();
                  return;
                }
                if (e.key === 'Enter' && !e.shiftKey && !composing && e.nativeEvent.keyCode !== 229) {
                  e.preventDefault();
                  submitPostit();
                }
              }}
              placeholder="写一张便签…（Enter 或 「保存」 提交 · Shift+Enter 换行 · Esc 取消）"
              style={{
                width: '100%',
                minHeight: 40,
                resize: 'vertical',
                border: '1px solid rgba(120,90,60,.3)',
                background: '#FEF4A8',
                fontFamily: '"Caveat", "Marker Felt", cursive',
                fontSize: 13,
                color: '#5a4a2a',
                padding: 8,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 6 }}>
              <button
                type="button"
                data-testid="corkboard-postit-cancel"
                onMouseDown={(e) => e.preventDefault()}
                onClick={closePostitAndReset}
                style={{
                  padding: '3px 9px',
                  background: 'transparent',
                  border: '1px solid rgba(120,90,60,.3)',
                  color: '#5a4a2a',
                  fontFamily: '"Noto Serif SC", serif',
                  fontSize: 10,
                  letterSpacing: 1,
                  cursor: 'pointer',
                  borderRadius: 2,
                }}
              >
                取消
              </button>
              <button
                type="button"
                data-testid="corkboard-postit-save"
                disabled={!postitDraft.trim()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={submitPostit}
                style={{
                  padding: '3px 9px',
                  background: postitDraft.trim() ? '#5a4a2a' : 'rgba(120,90,60,.3)',
                  border: '1px solid #5a4a2a',
                  color: postitDraft.trim() ? '#FEF4A8' : 'rgba(255,255,255,.6)',
                  fontFamily: '"Noto Serif SC", serif',
                  fontSize: 10,
                  letterSpacing: 1,
                  cursor: postitDraft.trim() ? 'pointer' : 'not-allowed',
                  borderRadius: 2,
                }}
              >
                保存
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface PinViewProps {
  pin: CorkboardPin & { x: number; y: number };
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onRemove: () => void;
  onAnnotationChange: (text: string) => void;
  onFocus: () => void;
}

function PinView({ pin, onDragStart, onRemove, onAnnotationChange, onFocus }: PinViewProps) {
  const [hover, setHover] = useState(false);
  const [composing, setComposing] = useState(false);
  const isNote = pin.kind === 'note';
  const pinColor =
    pin.kind === 'note' ? '#E0B040' :
    pin.kind === 'research' ? '#1772F6' :
    pin.kind === 'trends' ? '#C03028' :
    '#1772F6';
  const rotateBase = ((pin.id.charCodeAt(pin.id.length - 1) % 5) - 2) * 0.6;

  const wrapperStyle: CSSProperties = {
    position: 'absolute',
    left: pin.x,
    top: pin.y,
    width: pin.w,
    minHeight: pin.h,
    transform: `rotate(${rotateBase}deg)`,
    cursor: 'grab',
    transition: 'transform 0.18s ease',
  };

  const cardStyle: CSSProperties = isNote
    ? {
        background: '#FEF4A8',
        padding: '10px 10px 8px',
        fontFamily: '"Caveat", "Marker Felt", cursive',
        fontSize: 13,
        color: '#5a4a2a',
        lineHeight: 1.3,
        minHeight: pin.h,
        boxShadow: '0 3px 6px rgba(0,0,0,.15)',
      }
    : {
        background: '#FAF6EC',
        backgroundImage:
          'linear-gradient(180deg, rgba(255,255,255,.5), transparent 30%), repeating-linear-gradient(90deg, rgba(120,90,60,.04) 0 1px, transparent 1px 4px)',
        padding: '12px 10px 10px',
        minHeight: pin.h,
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.18)) drop-shadow(0 1px 2px rgba(0,0,0,.12))',
      };

  return (
    <div
      data-testid={`corkboard-pin-${pin.kind}`}
      data-pin-id={pin.id}
      data-created-by={pin.createdBy}
      draggable
      onDragStart={(e) => {
        onFocus();
        onDragStart(e);
      }}
      onMouseDown={onFocus}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={wrapperStyle}
    >
      {/* Pushpin */}
      <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
        <Pushpin color={pinColor} />
      </div>

      {/* Source-of-pin badge for 看山-pinned cards */}
      {pin.createdBy === 'kanshan' && (
        <div
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            zIndex: 3,
            padding: '1px 5px',
            fontSize: 8,
            letterSpacing: 1,
            background: 'rgba(168,155,126,0.85)',
            color: '#fff',
            fontFamily: '"Noto Serif SC", serif',
            borderRadius: 2,
          }}
        >
          看山
        </div>
      )}

      {/* Remove button (visible on hover) */}
      {hover && (
        <button
          data-testid={`corkboard-remove-${pin.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="移除"
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            zIndex: 4,
            width: 16,
            height: 16,
            borderRadius: 8,
            border: 'none',
            background: 'rgba(192,48,40,0.85)',
            color: '#fff',
            fontSize: 10,
            lineHeight: '14px',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ×
        </button>
      )}

      <div style={cardStyle}>
        {pin.kind !== 'note' && pin.content.title && (
          <div
            style={{
              fontFamily: '"Noto Sans SC", sans-serif',
              fontSize: 10,
              fontWeight: 600,
              color: pinColor,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            {pin.kind === 'vault'
              ? '看典 · 旧作'
              : pin.kind === 'research'
                ? '看水 · 文献'
                : '看势 · 热点'}
          </div>
        )}

        {pin.content.title && (
          <div
            style={{
              fontFamily: '"Noto Serif SC", serif',
              fontSize: isNote ? 13 : 12,
              color: '#1A1F2A',
              fontWeight: isNote ? 400 : 500,
              lineHeight: 1.4,
            }}
          >
            {pin.content.title}
          </div>
        )}

        {pin.content.snippet && (
          <div
            style={{
              fontSize: 10,
              color: '#5A4A38',
              marginTop: 6,
              lineHeight: 1.4,
              fontFamily: '"Noto Serif SC", serif',
            }}
          >
            {pin.content.snippet}
          </div>
        )}

        {isNote && (
          <textarea
            value={pin.content.annotation ?? ''}
            onChange={(e) => onAnnotationChange(e.target.value)}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            onKeyDown={(e) => {
              if (composing || e.nativeEvent.keyCode === 229) return;
            }}
            style={{
              width: '100%',
              minHeight: 50,
              border: 'none',
              background: 'transparent',
              fontFamily: '"Caveat", "Marker Felt", cursive',
              fontSize: 13,
              color: '#5a4a2a',
              outline: 'none',
              resize: 'none',
              padding: 0,
              lineHeight: 1.3,
            }}
          />
        )}
      </div>
    </div>
  );
}
