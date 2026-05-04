'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import { useEditorStore } from '@/lib/store/editor';

type DropdownId = 'font' | 'size' | 'color' | 'highlight' | null;

interface FontOption {
  label: string;
  family: string;
}
interface SizeOption {
  label: string;
  size: string;
}

const FONTS: FontOption[] = [
  { label: '宋体', family: '"Noto Serif SC", "Source Han Serif SC", serif' },
  { label: '黑体', family: '"Noto Sans SC", "Source Han Sans SC", sans-serif' },
  { label: '楷体', family: '"Ma Shan Zheng", "KaiTi", "STKaiti", serif' },
  { label: '等宽', family: '"JetBrains Mono", "Source Code Pro", monospace' },
];

const SIZES: SizeOption[] = [
  { label: '小', size: '12px' },
  { label: '正文', size: '14px' },
  { label: '默认', size: '16px' },
  { label: '加大', size: '18px' },
  { label: '小标题', size: '22px' },
  { label: '标题', size: '28px' },
  { label: '大标题', size: '36px' },
];

// Word-style color palette: 5 standard rows × 8 columns + 1 row of 8 muted accents.
const COLOR_GRID: string[][] = [
  ['#000000', '#404040', '#5A5A5A', '#7F7F7F', '#A6A6A6', '#D9D9D9', '#F2F2F2', '#FFFFFF'],
  ['#7B0606', '#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050', '#00B050', '#00B0F0'],
  ['#0070C0', '#002060', '#7030A0', '#1772F6', '#3FB48C', '#B85543', '#C03028', '#7A6655'],
  ['#FCE4D6', '#FFF2CC', '#FFFACD', '#E2EFDA', '#DAEEF3', '#D9E1F2', '#E4DFEC', '#FFD0D0'],
  ['#F8CBAD', '#FFE699', '#FFF59D', '#A9D08E', '#9DC3E6', '#B4C7E7', '#B4A7D6', '#FFB0B0'],
];

const HIGHLIGHT_PALETTE: { color: string; label: string }[] = [
  { color: '#FFF59D', label: '黄' },
  { color: '#B0E5BC', label: '绿' },
  { color: '#FFD0D0', label: '红' },
  { color: '#CFE3FF', label: '蓝' },
  { color: '#F4D9F8', label: '紫' },
  { color: '#FFE0B2', label: '橙' },
];

function currentFontLabel(editor: Editor | null): string {
  if (!editor) return FONTS[0].label;
  const attrs = editor.getAttributes('textStyle') as { fontFamily?: string };
  if (!attrs.fontFamily) return FONTS[0].label;
  const found = FONTS.find((f) => f.family === attrs.fontFamily);
  return found?.label ?? FONTS[0].label;
}
function currentSizeLabel(editor: Editor | null): string {
  if (!editor) return '16';
  const attrs = editor.getAttributes('textStyle') as { fontSize?: string };
  if (!attrs.fontSize) return '16';
  return attrs.fontSize.replace(/px$/, '');
}
function currentColor(editor: Editor | null): string | null {
  if (!editor) return null;
  const attrs = editor.getAttributes('textStyle') as { color?: string };
  return attrs.color ?? null;
}

const ribbonStyle: CSSProperties = {
  flexShrink: 0,
  height: 38,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '0 12px',
  background: '#F4EFE2',
  borderBottom: '1px solid rgba(0,0,0,0.10)',
  fontFamily: '"Noto Sans SC", sans-serif',
  fontSize: 12,
  color: '#1A1F2A',
  position: 'relative',
  zIndex: 30,
};

const dividerStyle: CSSProperties = {
  width: 1,
  height: 20,
  background: 'rgba(0,0,0,0.12)',
  margin: '0 6px',
};

export function FormatRibbon() {
  const editor = useEditorStore((s) => s.editor);
  const [, forceTick] = useState(0);
  const [open, setOpen] = useState<DropdownId>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);

  // Re-render on editor state changes so isActive / current font etc are reactive.
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

  // Click-outside closes.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (target && ribbonRef.current?.contains(target)) return;
      setOpen(null);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const disabled = !editor;
  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    !disabled && editor!.isActive(name, attrs);

  const run = (fn: (e: Editor) => void) => () => {
    if (!editor) return;
    fn(editor);
  };

  return (
    <div ref={ribbonRef} role="toolbar" aria-label="格式" style={ribbonStyle} data-testid="format-ribbon">
      <FontDropdown
        editor={editor}
        open={open === 'font'}
        onToggle={() => setOpen(open === 'font' ? null : 'font')}
        onClose={() => setOpen(null)}
      />
      <SizeDropdown
        editor={editor}
        open={open === 'size'}
        onToggle={() => setOpen(open === 'size' ? null : 'size')}
        onClose={() => setOpen(null)}
      />
      <span style={dividerStyle} />
      <RibbonButton
        testId="ribbon-bold"
        label="加粗"
        shortcut="Ctrl+B"
        active={isActive('bold')}
        disabled={disabled}
        onClick={run((e) => e.chain().focus().toggleBold().run())}
      >
        <strong style={{ fontSize: 13 }}>B</strong>
      </RibbonButton>
      <RibbonButton
        testId="ribbon-italic"
        label="斜体"
        shortcut="Ctrl+I"
        active={isActive('italic')}
        disabled={disabled}
        onClick={run((e) => e.chain().focus().toggleItalic().run())}
      >
        <em style={{ fontSize: 13 }}>I</em>
      </RibbonButton>
      <RibbonButton
        testId="ribbon-underline"
        label="下划线"
        shortcut="Ctrl+U"
        active={isActive('underline')}
        disabled={disabled}
        onClick={run((e) => e.chain().focus().toggleUnderline().run())}
      >
        <span style={{ fontSize: 13, textDecoration: 'underline' }}>U</span>
      </RibbonButton>
      <RibbonButton
        testId="ribbon-strike"
        label="删除线"
        shortcut="Ctrl+Shift+S"
        active={isActive('strike')}
        disabled={disabled}
        onClick={run((e) => e.chain().focus().toggleStrike().run())}
      >
        <span style={{ fontSize: 13, textDecoration: 'line-through' }}>S</span>
      </RibbonButton>
      <span style={dividerStyle} />
      <ColorTrigger
        editor={editor}
        open={open === 'color'}
        onToggle={() => setOpen(open === 'color' ? null : 'color')}
        onClose={() => setOpen(null)}
      />
      <HighlightTrigger
        editor={editor}
        open={open === 'highlight'}
        onToggle={() => setOpen(open === 'highlight' ? null : 'highlight')}
        onClose={() => setOpen(null)}
      />
    </div>
  );
}

interface RibbonButtonProps {
  testId: string;
  label: string;
  shortcut?: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}

function RibbonButton({ testId, label, shortcut, active, disabled, onClick, children }: RibbonButtonProps) {
  return (
    <button
      data-testid={testId}
      data-active={active ? 'true' : 'false'}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
      aria-label={label}
      aria-pressed={active}
      style={{
        width: 28,
        height: 26,
        borderRadius: 4,
        border: '1px solid transparent',
        background: active ? 'rgba(23,114,246,0.18)' : 'transparent',
        color: disabled ? '#B5AFA0' : '#1A1F2A',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        fontFamily: '"Noto Serif SC", serif',
        transition: 'background 0.12s, border 0.12s',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)';
      }}
      onMouseLeave={(e) => {
        if (active) return;
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

const dropdownTriggerStyle: CSSProperties = {
  height: 26,
  borderRadius: 4,
  border: '1px solid rgba(0,0,0,0.18)',
  background: '#FAF8F3',
  color: '#1A1F2A',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '0 8px',
  fontFamily: '"Noto Sans SC", sans-serif',
  fontSize: 12,
  whiteSpace: 'nowrap',
};

const dropdownPanelStyle: CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 4,
  background: '#FFFFFF',
  border: '1px solid rgba(0,0,0,0.16)',
  borderRadius: 6,
  boxShadow: '0 6px 16px rgba(0,0,0,0.16)',
  padding: 4,
  zIndex: 200,
  minWidth: 140,
  fontFamily: '"Noto Sans SC", sans-serif',
};

const dropdownItemStyle = (active: boolean): CSSProperties => ({
  padding: '6px 12px',
  borderRadius: 3,
  background: active ? 'rgba(23,114,246,0.12)' : 'transparent',
  color: '#1A1F2A',
  cursor: 'pointer',
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
});

interface DropdownProps {
  editor: Editor | null;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function FontDropdown({ editor, open, onToggle, onClose }: DropdownProps) {
  const currentLabel = currentFontLabel(editor);
  return (
    <span style={{ position: 'relative' }} data-testid="font-dropdown-wrap">
      <button
        data-testid="format-font"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggle}
        disabled={!editor}
        style={{ ...dropdownTriggerStyle, minWidth: 88 }}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="字体"
      >
        <span style={{ fontFamily: FONTS.find((f) => f.label === currentLabel)?.family ?? 'inherit' }}>
          {currentLabel}
        </span>
        <span style={{ opacity: 0.6, fontSize: 9 }}>▼</span>
      </button>
      {open && editor && (
        <div data-testid="font-panel" style={dropdownPanelStyle} role="listbox">
          {FONTS.map((f) => {
            const active = currentLabel === f.label;
            return (
              <div
                key={f.label}
                data-testid={`font-${f.label}`}
                role="option"
                aria-selected={active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().setFontFamily(f.family).run();
                  onClose();
                }}
                style={{ ...dropdownItemStyle(active), fontFamily: f.family }}
              >
                <span>{f.label}</span>
                <span style={{ opacity: 0.4, fontSize: 11 }}>Aa</span>
              </div>
            );
          })}
          <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />
          <div
            data-testid="font-clear"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.chain().focus().unsetFontFamily().run();
              onClose();
            }}
            style={dropdownItemStyle(false)}
          >
            <span style={{ opacity: 0.7 }}>清除字体</span>
          </div>
        </div>
      )}
    </span>
  );
}

function SizeDropdown({ editor, open, onToggle, onClose }: DropdownProps) {
  const currentLabel = currentSizeLabel(editor);
  return (
    <span style={{ position: 'relative' }} data-testid="size-dropdown-wrap">
      <button
        data-testid="format-size"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggle}
        disabled={!editor}
        style={{ ...dropdownTriggerStyle, minWidth: 56 }}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="字号"
      >
        <span>{currentLabel}</span>
        <span style={{ opacity: 0.6, fontSize: 9 }}>▼</span>
      </button>
      {open && editor && (
        <div data-testid="size-panel" style={dropdownPanelStyle} role="listbox">
          {SIZES.map((s) => {
            const active = currentLabel === s.size.replace(/px$/, '');
            return (
              <div
                key={s.size}
                data-testid={`size-${s.size}`}
                role="option"
                aria-selected={active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  editor.chain().focus().setFontSize(s.size).run();
                  onClose();
                }}
                style={{ ...dropdownItemStyle(active), fontSize: parseInt(s.size, 10) <= 18 ? 13 : 14 }}
              >
                <span>{s.label}</span>
                <span style={{ opacity: 0.5, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{s.size}</span>
              </div>
            );
          })}
          <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />
          <div
            data-testid="size-clear"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.chain().focus().unsetFontSize().run();
              onClose();
            }}
            style={dropdownItemStyle(false)}
          >
            <span style={{ opacity: 0.7 }}>清除字号</span>
          </div>
        </div>
      )}
    </span>
  );
}

function ColorTrigger({ editor, open, onToggle, onClose }: DropdownProps) {
  const cur = currentColor(editor);
  return (
    <span style={{ position: 'relative' }} data-testid="color-dropdown-wrap">
      <button
        data-testid="format-color-trigger"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggle}
        disabled={!editor}
        style={{
          ...dropdownTriggerStyle,
          padding: '0 6px',
          gap: 3,
          height: 26,
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="字体颜色"
      >
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, gap: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>A</span>
          <span style={{ width: 14, height: 3, background: cur ?? '#1A1F2A' }} />
        </span>
        <span style={{ opacity: 0.6, fontSize: 9 }}>▼</span>
      </button>
      {open && editor && <ColorPanel editor={editor} kind="color" onClose={onClose} />}
    </span>
  );
}

function HighlightTrigger({ editor, open, onToggle, onClose }: DropdownProps) {
  const attrs = editor?.getAttributes('highlight') as { color?: string } | undefined;
  const cur = attrs?.color;
  return (
    <span style={{ position: 'relative' }} data-testid="highlight-dropdown-wrap">
      <button
        data-testid="format-highlight-trigger"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggle}
        disabled={!editor}
        style={{
          ...dropdownTriggerStyle,
          padding: '0 6px',
          gap: 3,
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="高亮"
      >
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, gap: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 600, background: cur ?? '#FFF59D', padding: '0 3px', borderRadius: 2 }}>H</span>
        </span>
        <span style={{ opacity: 0.6, fontSize: 9 }}>▼</span>
      </button>
      {open && editor && <HighlightPanel editor={editor} onClose={onClose} />}
    </span>
  );
}

function ColorPanel({ editor, kind, onClose }: { editor: Editor; kind: 'color'; onClose: () => void }) {
  const apply = (c: string) => {
    if (kind === 'color') editor.chain().focus().setColor(c).run();
    onClose();
  };
  const clear = () => {
    if (kind === 'color') editor.chain().focus().unsetColor().run();
    onClose();
  };
  return (
    <div
      data-testid="color-panel"
      style={{
        ...dropdownPanelStyle,
        padding: 10,
        minWidth: 240,
      }}
    >
      <div style={{ fontSize: 11, color: '#5A6270', marginBottom: 6 }}>主题颜色</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 22px)', gap: 4 }}>
        {COLOR_GRID.flat().map((c) => (
          <button
            key={c}
            data-testid={`color-cell-${c}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => apply(c)}
            title={c}
            style={{
              width: 22,
              height: 22,
              border: '1px solid rgba(0,0,0,0.16)',
              borderRadius: 2,
              background: c,
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>
      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '8px 0' }} />
      <button
        data-testid="color-clear"
        onMouseDown={(e) => e.preventDefault()}
        onClick={clear}
        style={{
          width: '100%',
          padding: '6px 8px',
          border: '1px dashed rgba(0,0,0,0.18)',
          background: 'transparent',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12,
          color: '#5A6270',
          fontFamily: '"Noto Sans SC", sans-serif',
        }}
      >
        恢复默认颜色
      </button>
    </div>
  );
}

function HighlightPanel({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  return (
    <div
      data-testid="highlight-panel"
      style={{
        ...dropdownPanelStyle,
        padding: 10,
        minWidth: 200,
      }}
    >
      <div style={{ fontSize: 11, color: '#5A6270', marginBottom: 6 }}>高亮颜色</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 22px)', gap: 6 }}>
        {HIGHLIGHT_PALETTE.map((s) => (
          <button
            key={s.color}
            data-testid={`highlight-cell-${s.label}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              editor.chain().focus().toggleHighlight({ color: s.color }).run();
              onClose();
            }}
            title={s.label}
            style={{
              width: 22,
              height: 22,
              border: '1px solid rgba(0,0,0,0.16)',
              borderRadius: 2,
              background: s.color,
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>
      <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '8px 0' }} />
      <button
        data-testid="highlight-clear"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          editor.chain().focus().unsetHighlight().run();
          onClose();
        }}
        style={{
          width: '100%',
          padding: '6px 8px',
          border: '1px dashed rgba(0,0,0,0.18)',
          background: 'transparent',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12,
          color: '#5A6270',
          fontFamily: '"Noto Sans SC", sans-serif',
        }}
      >
        清除高亮
      </button>
    </div>
  );
}
