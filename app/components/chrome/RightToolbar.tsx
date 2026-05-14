'use client';
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { FOX_BY_ID, type FoxId } from '@/lib/foxes/registry';
import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { useDailyFoxPulseStore } from '@/lib/store/daily-fox-pulse';
import { FoxGuideCard } from '@/components/atoms/FoxGuideCard';
import { detectClaims } from '@/lib/compliance/xin-detect';
import { useProvenanceStore } from '@/lib/store/provenance';
import { useAiErrorStore } from '@/lib/store/ai-error';

export interface RightToolbarProps {
  selection: { text: string; rect: DOMRect } | null;
}

interface AiItem {
  id: string;
  foxId: FoxId;
  /** Optional override for the hover-guide lookup so foxes with multiple
   *  right-rail actions (wen: 召集读者 vs 请看辩开场) show distinct copy. */
  guideId?: string;
  icon: ReactNode;
  label: string;
  shortcut?: string;
  accentColor?: string;
  needsSelection?: boolean;
  onClick: (selection: { text: string; rect: DOMRect } | null) => void;
}

export function RightToolbar({ selection }: RightToolbarProps) {
  const openTab = useFloatingWindowStore((s) => s.openTab);
  const hasSel = !!selection;

  const dispatchAi = (kind: Parameters<typeof openTab>[0], title: string, props: Record<string, unknown> = {}) => {
    openTab(kind, title, props);
  };

  // mo + wen each have 2 actions in this rail; `glyph` disambiguates so the
  // strip doesn't read "墨 墨 文 文" as a bug.
  const aiTool = (foxId: FoxId, label: string, shortcut: string | undefined, needsSelection: boolean, onClick: () => void, glyph?: string, guideId?: string): AiItem => {
    const fox = FOX_BY_ID[foxId];
    return {
      id: `ai-${foxId}-${label}`,
      foxId,
      guideId,
      icon: (
        <span style={{
          width: 18, height: 18, borderRadius: 9,
          background: fox.glow, color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: '"Noto Serif SC", serif',
          fontSize: glyph && glyph.length === 2 ? 8.5 : 11, fontWeight: 600,
          letterSpacing: glyph && glyph.length === 2 ? -0.4 : 0,
        }}>{glyph ?? fox.initial}</span>
      ),
      label, shortcut, accentColor: fox.glow, needsSelection,
      onClick,
    };
  };

  // r4 张荣乐 P0 + 吴伟 P2 (2026-05-12 sprint subtraction): right rail =
  // advanced 5 ONLY. Daily 4 (mo / shi / dian / shui) live in the topbar
  // (TitleBar daily-launchers) — duplicating them here was the cognitive-load
  // failure 张荣乐 flagged in r4. Selection-driven Ctrl+Shift+M/R/F shortcuts
  // still fire via `useGlobalShortcuts` so the keyboard path is preserved.
  // Right rail now: wen×2 (persona + debate), wen2 (custom-mask), jing (stats),
  // xin (compliance) = 5 actions across 4 advanced foxes.
  const AI_TOOLS: AiItem[] = [
    aiTool('wen', '召集读者团', 'Ctrl+Shift+R', true, () => selection && dispatchAi('persona', '看文 · 读者团', { mode: 'auto', selection }), '文读', 'wen'),
    aiTool('wen', '请看辩开场', undefined, true, () => selection && dispatchAi('debate', '看辩席 · 正反对论', { selection }), '文辩', 'wen-debate'),
    aiTool('wen2', '让看纹剪一张脸', undefined, true, () => selection && dispatchAi('debate', '看纹 · 自定读者', { selection, mode: 'custom-mask' }), '纹'),
    aiTool('jing', '问看镜看看', undefined, false, () => dispatchAi('stats', '看镜 · 数据', {})),
    aiTool('xin', '让看心审一审', undefined, true, () => {
      if (!selection) return;
      const flags = detectClaims(selection.text);
      const excerpt = selection.text.slice(0, 80);
      const add = useProvenanceStore.getState().add;
      const found: string[] = [];
      if (flags.medical)    { add({ kind: 'flagged', excerpt, fox: 'xin', relatedAction: 'medical-claim' });    found.push('医学强声明'); }
      if (flags.financial)  { add({ kind: 'flagged', excerpt, fox: 'xin', relatedAction: 'financial-claim' });  found.push('财务强声明'); }
      if (flags.cherryPick) { add({ kind: 'hedge',   excerpt, fox: 'xin', relatedAction: 'cherry-pick' });      found.push('个例外推'); }
      const msg = found.length
        ? `看心已标 ${found.length} 处：${found.join(' / ')} — 看底栏审计明细。`
        : '看心审过 — 未发现医学/财务强声明，可发布。';
      useAiErrorStore.getState().push({ message: msg });
    }),
  ];

  return (
    <div
      role="toolbar"
      aria-label="AI 工具栏"
      // Y8-P1c (2026-05-11): tour Step 1 now anchors here (was on the bottom
      // FoxRail, which got removed in Y8-P2b). Keeping the original selector
      // name `fox-tails` so steps.ts doesn't need to know about the move.
      data-tour-id="fox-tails"
      // r5 TASK G (emmett P1): dim advanced-5 to opacity 0.55 by default so
      // judges read the daily-4 (top bar) as primary. Brighten on hover/focus
      // so discovery isn't lost. Uses CSS variables so the hover transition
      // is GPU-cheap.
      data-rail="advanced-5"
      style={{
        position: 'absolute',
        right: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 2,
        padding: '6px 5px',
        background: 'rgba(26,31,42,0.72)',
        backdropFilter: 'blur(8px)',
        borderRadius: 22,
        boxShadow: '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
        maxHeight: '90vh',
        overflowY: 'auto',
        scrollbarWidth: 'none',
        opacity: 0.55,
        transition: 'opacity 0.18s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.55'; }}
      onFocus={(e) => { e.currentTarget.style.opacity = '1'; }}
      onBlur={(e) => { e.currentTarget.style.opacity = '0.55'; }}
    >
      {AI_TOOLS.map((t) => (
        <AiButton key={t.id} tool={t} hasSelection={hasSel} selection={selection} />
      ))}
    </div>
  );
}

function AiButton({ tool, hasSelection, selection }: { tool: AiItem; hasSelection: boolean; selection: { text: string; rect: DOMRect } | null }) {
  const [hover, setHover] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const glowingFox = useDailyFoxPulseStore((s) => s.glowingFox);
  const pulsing = glowingFox === tool.foxId;
  const disabled = !!tool.needsSelection && !hasSelection;
  const onClick = () => {
    if (disabled) return;
    tool.onClick(selection);
  };

  const handleEnter = () => {
    setHover(true);
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    openTimerRef.current = window.setTimeout(() => {
      if (btnRef.current) setAnchorRect(btnRef.current.getBoundingClientRect());
      setGuideOpen(true);
    }, 300);
  };
  const handleLeave = () => {
    setHover(false);
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    setGuideOpen(false);
  };

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{ position: 'relative' }}
    >
      <button
        ref={btnRef}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        disabled={disabled}
        title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}${tool.foxId === 'xin' ? ' · 端侧规则匹配' : ''}`}
        aria-label={tool.label}
        aria-disabled={disabled}
        data-fox-id={tool.foxId}
        data-pulsing={pulsing ? 'true' : undefined}
        style={buttonStyle(hover, disabled, pulsing, FOX_BY_ID[tool.foxId].glow)}
      >
        {tool.icon}
        {/* r5 TASK J (李大海 P1): 端 badge marks foxes that run in the
            browser (rule-based xin / local-vector dian). Tiny corner glyph
            so it doesn't compete with the fox initial. */}
        {tool.foxId === 'xin' && (
          <span
            aria-hidden
            data-testid="fox-edge-badge"
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              fontSize: 8,
              lineHeight: '11px',
              padding: '0 3px',
              borderRadius: 6,
              background: '#1F5B47',
              color: '#FBFAF7',
              fontFamily: '"Noto Serif SC", serif',
              fontWeight: 600,
              letterSpacing: 0.4,
              boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
            }}
          >
            端
          </span>
        )}
      </button>
      {guideOpen && anchorRect && !disabled && (
        <FoxGuideCard foxId={tool.foxId} guideId={tool.guideId} anchorRect={anchorRect} onClose={() => setGuideOpen(false)} />
      )}
    </div>
  );
}

function buttonStyle(hover: boolean, disabled: boolean, pulsing = false, pulseColor = '#fff'): CSSProperties {
  return {
    width: 26, height: 26, borderRadius: 13,
    border: 'none',
    background: hover && !disabled ? 'rgba(255,255,255,0.12)' : 'transparent',
    color: disabled ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.85)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: '"Noto Serif SC", serif',
    fontSize: 13, lineHeight: 1,
    padding: 0,
    transition: 'background 0.15s, color 0.15s, box-shadow 0.4s',
    flexShrink: 0,
    boxShadow: pulsing ? `0 0 0 3px ${pulseColor}66, 0 0 16px ${pulseColor}` : undefined,
  };
}

