'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import { FOX_BY_ID, type FoxId } from '@/lib/foxes/registry';
import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { useEditorStore } from '@/lib/store/editor';

export interface RightToolbarProps {
  selection: { text: string; rect: DOMRect } | null;
}

type PopoverId = 'highlight' | 'color' | 'fontsize' | null;

interface FormatItem {
  id: string;
  icon: ReactNode;
  label: string;
  shortcut?: string;
  needsSelection?: boolean;
  isActive?: (editor: Editor) => boolean;
  onClick?: (editor: Editor) => void;
  popover?: 'highlight' | 'color' | 'fontsize';
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

const HIGHLIGHT_SWATCHES = [
  { color: '#FFF59D', label: '黄' },
  { color: '#B0E5BC', label: '绿' },
  { color: '#FFD0D0', label: '红' },
] as const;

const COLOR_SWATCHES = [
  { color: '#1A1F2A', label: '默认' },
  { color: '#C03028', label: '朱红' },
  { color: '#1772F6', label: '蓝' },
  { color: '#3FB48C', label: '青' },
  { color: '#B85543', label: '锈红' },
  { color: '#7A6655', label: '茶褐' },
] as const;

const SIZE_PRESETS = [
  { size: '12px', label: '小' },
  { size: '14px', label: '中' },
  { size: '16px', label: '默认' },
  { size: '18px', label: '大' },
  { size: '22px', label: '标题' },
  { size: '28px', label: '标题大' },
] as const;

export function RightToolbar({ selection }: RightToolbarProps) {
  const openTab = useFloatingWindowStore((s) => s.openTab);
  const editor = useEditorStore((s) => s.editor);
  const [, forceTick] = useState(0);
  const [openPopover, setOpenPopover] = useState<PopoverId>(null);
  const popoverWrapRef = useRef<HTMLDivElement>(null);
  const hasSel = !!selection;

  // Re-render on every editor transaction so isActive() checks stay reactive.
  useEffect(() => {
    if (!editor) return;
    const handler = () => forceTick((t) => t + 1);
    editor.on('transaction', handler);
    editor.on('selectionUpdate', handler);
    return () => {
      editor.off('transaction', handler);
      editor.off('selectionUpdate', handler);
    };
  }, [editor]);

  // Click-outside closes popover.
  useEffect(() => {
    if (!openPopover) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (target && popoverWrapRef.current?.contains(target)) return;
      setOpenPopover(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openPopover]);

  const dispatchAi = (kind: Parameters<typeof openTab>[0], title: string, props: Record<string, unknown> = {}) => {
    openTab(kind, title, props);
  };

  const FORMAT_TOOLS: FormatItem[] = [
    {
      id: 'bold', icon: <strong>B</strong>, label: '加粗', shortcut: 'Ctrl+B', needsSelection: true,
      isActive: (e) => e.isActive('bold'),
      onClick: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      id: 'italic', icon: <em>I</em>, label: '斜体', shortcut: 'Ctrl+I', needsSelection: true,
      isActive: (e) => e.isActive('italic'),
      onClick: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      id: 'underline', icon: <span style={{ textDecoration: 'underline' }}>U</span>, label: '下划线', shortcut: 'Ctrl+U', needsSelection: true,
      isActive: (e) => e.isActive('underline'),
      onClick: (e) => e.chain().focus().toggleUnderline().run(),
    },
    {
      id: 'strike', icon: <span style={{ textDecoration: 'line-through' }}>S</span>, label: '删除线', shortcut: 'Ctrl+Shift+S', needsSelection: true,
      isActive: (e) => e.isActive('strike'),
      onClick: (e) => e.chain().focus().toggleStrike().run(),
    },
    {
      id: 'highlight', icon: <span style={{ background: '#FFF59D', padding: '0 3px', borderRadius: 2 }}>H</span>, label: '高亮', shortcut: 'Ctrl+H', needsSelection: true,
      isActive: (e) => e.isActive('highlight'),
      popover: 'highlight',
    },
    {
      id: 'color', icon: <span style={{ color: '#C03028' }}>A</span>, label: '字体颜色', needsSelection: true,
      isActive: (e) => e.isActive('textStyle', { color: /.+/ }),
      popover: 'color',
    },
    {
      id: 'fontsize', icon: <span style={{ fontSize: 11 }}>Aa</span>, label: '字号', needsSelection: true,
      popover: 'fontsize',
    },
  ];

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
      aria-label="格式与 AI 工具栏"
      ref={popoverWrapRef}
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
      {FORMAT_TOOLS.map((t) => (
        <FormatButton
          key={t.id}
          tool={t}
          editor={editor}
          hasSelection={hasSel}
          openPopover={openPopover}
          setOpenPopover={setOpenPopover}
        />
      ))}
      <Spacer />
      {AI_TOOLS.map((t) => (
        <AiButton key={t.id} tool={t} hasSelection={hasSel} selection={selection} />
      ))}
    </div>
  );
}

function Spacer() {
  return <div style={{ height: 1, width: 18, background: 'rgba(255,255,255,0.15)', margin: '4px 0' }} />;
}

interface FormatButtonProps {
  tool: FormatItem;
  editor: Editor | null;
  hasSelection: boolean;
  openPopover: PopoverId;
  setOpenPopover: (id: PopoverId) => void;
}

function FormatButton({ tool, editor, hasSelection, openPopover, setOpenPopover }: FormatButtonProps) {
  const [hover, setHover] = useState(false);
  const disabled = (!!tool.needsSelection && !hasSelection) || !editor;
  const active = !disabled && editor && tool.isActive ? tool.isActive(editor) : false;
  const popoverOpen = !!tool.popover && openPopover === tool.popover;

  const onClick = () => {
    if (disabled || !editor) return;
    if (tool.popover) {
      setOpenPopover(popoverOpen ? null : tool.popover);
      return;
    }
    tool.onClick?.(editor);
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative' }}
    >
      <button
        data-testid={`format-${tool.id}`}
        data-active={active ? 'true' : 'false'}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        disabled={disabled}
        title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
        aria-label={tool.label}
        aria-pressed={active}
        aria-disabled={disabled}
        style={buttonStyle(hover, disabled, active)}
      >
        {tool.icon}
      </button>
      {hover && !popoverOpen && (
        <Tooltip label={tool.label} shortcut={tool.shortcut} />
      )}
      {popoverOpen && editor && tool.popover === 'highlight' && (
        <HighlightPopover editor={editor} onClose={() => setOpenPopover(null)} />
      )}
      {popoverOpen && editor && tool.popover === 'color' && (
        <ColorPopover editor={editor} onClose={() => setOpenPopover(null)} />
      )}
      {popoverOpen && editor && tool.popover === 'fontsize' && (
        <FontSizePopover editor={editor} onClose={() => setOpenPopover(null)} />
      )}
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
        style={buttonStyle(hover, disabled, false)}
      >
        {tool.icon}
      </button>
      {hover && <Tooltip label={tool.label} shortcut={tool.shortcut} />}
    </div>
  );
}

function buttonStyle(hover: boolean, disabled: boolean, active: boolean): CSSProperties {
  return {
    width: 26, height: 26, borderRadius: 13,
    border: 'none',
    background: active ? 'rgba(255,255,255,0.22)' : (hover && !disabled ? 'rgba(255,255,255,0.12)' : 'transparent'),
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

const popoverShellStyle: CSSProperties = {
  position: 'absolute',
  right: 'calc(100% + 10px)',
  top: '50%',
  transform: 'translateY(-50%)',
  background: '#1F1A14',
  border: '1px solid rgba(232,220,196,0.18)',
  padding: 8,
  borderRadius: 6,
  boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
  zIndex: 110,
  fontFamily: '"Noto Sans SC", sans-serif',
};

function HighlightPopover({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  return (
    <div data-testid="highlight-popover" style={popoverShellStyle}>
      <div style={{ display: 'flex', gap: 6 }}>
        {HIGHLIGHT_SWATCHES.map((s) => (
          <button
            key={s.color}
            data-testid={`highlight-swatch-${s.label}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.chain().focus().toggleHighlight({ color: s.color }).run();
              onClose();
            }}
            title={s.label}
            style={{
              width: 22, height: 22, borderRadius: 4,
              background: s.color, border: '1px solid rgba(0,0,0,0.2)',
              cursor: 'pointer', padding: 0,
            }}
          />
        ))}
        <button
          data-testid="highlight-swatch-clear"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            editor.chain().focus().unsetHighlight().run();
            onClose();
          }}
          title="清除"
          style={{
            width: 22, height: 22, borderRadius: 4,
            background: 'transparent',
            color: 'rgba(232,220,196,0.85)',
            border: '1px dashed rgba(232,220,196,0.45)',
            cursor: 'pointer', padding: 0,
            fontSize: 12, lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function ColorPopover({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  return (
    <div data-testid="color-popover" style={popoverShellStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 22px)', gap: 6 }}>
        {COLOR_SWATCHES.map((s, i) => (
          <button
            key={s.color}
            data-testid={`color-swatch-${s.label}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (i === 0) editor.chain().focus().unsetColor().run();
              else editor.chain().focus().setColor(s.color).run();
              onClose();
            }}
            title={s.label}
            style={{
              width: 22, height: 22, borderRadius: 4,
              background: s.color, border: '1px solid rgba(255,255,255,0.18)',
              cursor: 'pointer', padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function FontSizePopover({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  return (
    <div data-testid="fontsize-popover" style={popoverShellStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 88 }}>
        {SIZE_PRESETS.map((p) => (
          <button
            key={p.size}
            data-testid={`fontsize-${p.size}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.chain().focus().setFontSize(p.size).run();
              onClose();
            }}
            style={{
              padding: '4px 8px', borderRadius: 4, border: 'none',
              background: 'transparent', color: '#E8DCC4',
              cursor: 'pointer', textAlign: 'left',
              fontSize: 12, fontFamily: '"Noto Sans SC", sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            }}
          >
            <span>{p.label}</span>
            <span style={{ opacity: 0.5, fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>{p.size}</span>
          </button>
        ))}
        <button
          data-testid="fontsize-clear"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            editor.chain().focus().unsetFontSize().run();
            onClose();
          }}
          style={{
            padding: '4px 8px', borderRadius: 4, border: '1px dashed rgba(232,220,196,0.35)',
            background: 'transparent', color: '#E8DCC4',
            cursor: 'pointer', textAlign: 'left',
            fontSize: 12, fontFamily: '"Noto Sans SC", sans-serif',
            marginTop: 2,
          }}
        >
          清除字号
        </button>
      </div>
    </div>
  );
}
