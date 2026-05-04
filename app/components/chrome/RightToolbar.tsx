'use client';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { FOX_BY_ID, type FoxId } from '@/lib/foxes/registry';
import { useFloatingWindowStore } from '@/lib/store/floating-window';

export interface RightToolbarProps {
  selection: { text: string; rect: DOMRect } | null;
}

interface AiItem {
  id: string;
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

  const aiTool = (foxId: FoxId, label: string, shortcut: string | undefined, needsSelection: boolean, onClick: () => void): AiItem => {
    const fox = FOX_BY_ID[foxId];
    return {
      id: `ai-${foxId}-${label}`,
      icon: (
        <span style={{
          width: 18, height: 18, borderRadius: 9,
          background: fox.glow, color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 11, fontWeight: 600,
        }}>{fox.initial}</span>
      ),
      label, shortcut, accentColor: fox.glow, needsSelection,
      onClick,
    };
  };

  const AI_TOOLS: AiItem[] = [
    aiTool('mo', '让看墨润色', 'Ctrl+Shift+M', true, () => selection && dispatchAi('voice-diff', '看墨 · 润色', { mode: 'polish', selection })),
    aiTool('mo', '让看墨续写', undefined, true, () => selection && dispatchAi('voice-diff', '看墨 · 续写', { mode: 'fill', selection })),
    aiTool('wen', '召集读者团', 'Ctrl+Shift+R', true, () => selection && dispatchAi('persona', '看文 · 读者团', { mode: 'auto', selection })),
    aiTool('wen', '请看辩开场', undefined, true, () => selection && dispatchAi('debate', '看辩席 · 正反对论', { selection })),
    aiTool('shui', '让看水查证', 'Ctrl+Shift+F', true, () => selection && dispatchAi('research', '看水 · 查证', { selection })),
    aiTool('dian', '让看典找旧文', undefined, false, () => dispatchAi('vault', '看典 · 档案库', {})),
    aiTool('shi', '问看势热榜', undefined, false, () => dispatchAi('trends', '看势 · 热榜', {})),
    aiTool('jing', '问看镜看看', undefined, false, () => dispatchAi('stats', '看镜 · 数据', {})),
    aiTool('xin', '让看心审一审', undefined, true, () => selection && console.log('[看心] compliance review (plan #10):', selection.text)),
  ];

  return (
    <div
      role="toolbar"
      aria-label="AI 工具栏"
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
      }}
    >
      {AI_TOOLS.map((t) => (
        <AiButton key={t.id} tool={t} hasSelection={hasSel} selection={selection} />
      ))}
    </div>
  );
}

function AiButton({ tool, hasSelection, selection }: { tool: AiItem; hasSelection: boolean; selection: { text: string; rect: DOMRect } | null }) {
  const [hover, setHover] = useState(false);
  const disabled = !!tool.needsSelection && !hasSelection;
  const onClick = () => {
    if (disabled) return;
    tool.onClick(selection);
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative' }}
    >
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        disabled={disabled}
        title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
        aria-label={tool.label}
        aria-disabled={disabled}
        style={buttonStyle(hover, disabled)}
      >
        {tool.icon}
      </button>
      {hover && <Tooltip label={tool.label} shortcut={tool.shortcut} />}
    </div>
  );
}

function buttonStyle(hover: boolean, disabled: boolean): CSSProperties {
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
    transition: 'background 0.15s, color 0.15s',
    flexShrink: 0,
  };
}

function Tooltip({ label, shortcut }: { label: string; shortcut?: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 'calc(100% + 10px)',
        top: '50%',
        transform: 'translateY(-50%)',
        background: '#1A1815',
        color: '#E8DCC4',
        padding: '4px 10px',
        borderRadius: 4,
        fontSize: 11,
        fontFamily: '"Noto Sans SC", sans-serif',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        zIndex: 100,
        letterSpacing: 0.4,
      }}
    >
      {label}
      {shortcut && (
        <span style={{ marginLeft: 8, opacity: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>
          {shortcut}
        </span>
      )}
    </div>
  );
}
