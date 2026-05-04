'use client';
import { useState, type ReactNode } from 'react';
import { FOX_BY_ID, type FoxId } from '@/lib/foxes/registry';
import { useFloatingWindowStore } from '@/lib/store/floating-window';

export interface RightToolbarProps {
  selection: { text: string; rect: DOMRect } | null;
}

interface ToolItem {
  id: string;
  /** Single icon character or short label rendered in the rail */
  icon: ReactNode;
  /** Full hover-expand name (Chinese) */
  label: string;
  /** Optional shortcut hint shown after the label */
  shortcut?: string;
  /** Optional fox color for the dot/border accent */
  accentColor?: string;
  /** Whether the tool requires a text selection to fire */
  needsSelection?: boolean;
  onClick: (selection: { text: string; rect: DOMRect } | null) => void;
}

function execFormat(cmd: 'bold' | 'italic' | 'underline', value?: string) {
  try { document.execCommand(cmd, false, value); } catch { /* no-op */ }
}
function execHighlight(color: string) {
  try { document.execCommand('hiliteColor', false, color); } catch { /* no-op */ }
}
function execColor(color: string) {
  try { document.execCommand('foreColor', false, color); } catch { /* no-op */ }
}
function execFontSize(size: string) {
  // execCommand fontSize takes 1-7; map common sizes
  try { document.execCommand('fontSize', false, size); } catch { /* no-op */ }
}

export function RightToolbar({ selection }: RightToolbarProps) {
  const openTab = useFloatingWindowStore((s) => s.openTab);
  const hasSel = !!selection;

  const dispatchAi = (kind: Parameters<typeof openTab>[0], title: string, props: Record<string, unknown> = {}) => {
    openTab(kind, title, props);
  };

  const FORMAT_TOOLS: ToolItem[] = [
    {
      id: 'bold', icon: <strong>B</strong>, label: '加粗', shortcut: 'Ctrl+B', needsSelection: true,
      onClick: () => execFormat('bold'),
    },
    {
      id: 'italic', icon: <em>I</em>, label: '斜体', shortcut: 'Ctrl+I', needsSelection: true,
      onClick: () => execFormat('italic'),
    },
    {
      id: 'underline', icon: <span style={{ textDecoration: 'underline' }}>U</span>, label: '下划线', shortcut: 'Ctrl+U', needsSelection: true,
      onClick: () => execFormat('underline'),
    },
    {
      id: 'highlight', icon: <span style={{ background: '#FFF59D', padding: '0 3px', borderRadius: 2 }}>H</span>, label: '高亮', shortcut: 'Ctrl+H', needsSelection: true,
      onClick: () => execHighlight('#FFF59D'),
    },
    {
      id: 'color', icon: <span style={{ color: '#C03028' }}>A</span>, label: '字体颜色', needsSelection: true,
      onClick: () => execColor('#C03028'),
    },
    {
      id: 'fontsize', icon: <span style={{ fontSize: 11 }}>Aa</span>, label: '字号', needsSelection: true,
      onClick: () => execFontSize('5'),
    },
  ];

  const aiTool = (foxId: FoxId, label: string, shortcut: string | undefined, needsSelection: boolean, onClick: () => void): ToolItem => {
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

  const AI_TOOLS: ToolItem[] = [
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
      aria-label="格式与 AI 工具栏"
      style={{
        flexShrink: 0,
        width: 36,
        height: '100%',
        background: 'linear-gradient(180deg, #2C2825 0%, #221F1C 100%)',
        borderLeft: '1px solid #1A1815',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '8px 0',
        gap: 4,
        overflow: 'visible',
      }}
    >
      {FORMAT_TOOLS.map((t) => <ToolButton key={t.id} tool={t} hasSelection={hasSel} selection={selection} />)}
      <Spacer />
      {AI_TOOLS.map((t) => <ToolButton key={t.id} tool={t} hasSelection={hasSel} selection={selection} />)}
    </div>
  );
}

function Spacer() {
  return <div style={{ height: 1, width: 20, background: 'rgba(168,155,126,0.25)', margin: '6px 0' }} />;
}

function ToolButton({ tool, hasSelection, selection }: { tool: ToolItem; hasSelection: boolean; selection: { text: string; rect: DOMRect } | null }) {
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
        onMouseDown={(e) => e.preventDefault()}  // preserve text selection on click
        onClick={onClick}
        disabled={disabled}
        title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
        aria-label={tool.label}
        aria-disabled={disabled}
        style={{
          width: 28, height: 28, borderRadius: 5,
          border: 'none',
          background: hover && !disabled ? 'rgba(255,255,255,0.10)' : 'transparent',
          color: disabled ? 'rgba(168,155,126,0.35)' : '#E8DCC4',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: '"Noto Serif SC", serif',
          fontSize: 14, lineHeight: 1,
          padding: 0,
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        {tool.icon}
      </button>
      {hover && (
        <div
          style={{
            position: 'absolute',
            right: 'calc(100% + 8px)',
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
          {tool.label}
          {tool.shortcut && (
            <span style={{ marginLeft: 8, opacity: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>
              {tool.shortcut}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
