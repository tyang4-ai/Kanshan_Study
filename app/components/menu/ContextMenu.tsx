'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FOX_BY_ID, type FoxId } from '@/lib/foxes/registry';
import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { Divider } from './Divider';
import { MenuItem } from './MenuItem';
import { Submenu } from './Submenu';

function FoxDot({ id, enabled }: { id: FoxId; enabled: boolean }) {
  const fox = FOX_BY_ID[id];
  return (
    <span
      style={{
        width: 14, height: 14, borderRadius: 7,
        background: enabled ? fox.glow : '#D0CDC4',
        color: '#fff', fontSize: 9, fontWeight: 700,
        fontFamily: '"Noto Serif SC", serif',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {fox.initial}
    </span>
  );
}

export interface ContextMenuSelection {
  text: string;
  rect: DOMRect;
}

interface ContextMenuProps {
  x: number;
  y: number;
  hasSelection: boolean;
  selection: ContextMenuSelection | null;
  onClose: () => void;
}

const MENU_W = 240;
const VIEWPORT_PAD = 8;

export function ContextMenu({ x, y, hasSelection, selection, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenuOpenIndex, setSubmenuOpenIndex] = useState<number | null>(null);
  // Render off-screen first; useLayoutEffect measures actual height + repositions
  // before paint so the user never sees a truncated menu.
  const [pos, setPos] = useState<{ x: number; y: number }>({ x, y });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Measure rendered menu height after first paint and flip up if it overflows the
  // viewport bottom. Same idea horizontally — flip left if it overflows right edge.
  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    let nextX = x;
    let nextY = y;
    if (x + rect.width + VIEWPORT_PAD > viewW) {
      nextX = Math.max(VIEWPORT_PAD, viewW - rect.width - VIEWPORT_PAD);
    }
    if (y + rect.height + VIEWPORT_PAD > viewH) {
      // Flip up: anchor menu's bottom edge at click point
      nextY = Math.max(VIEWPORT_PAD, y - rect.height);
    }
    if (nextX !== pos.x || nextY !== pos.y) setPos({ x: nextX, y: nextY });
  }, [x, y, pos.x, pos.y]);

  const openTab = useFloatingWindowStore((s) => s.openTab);

  // ---- Native commands -----------------------------------------------------
  // document.execCommand is deprecated but still implemented across browsers
  // and matches the mockup behavior; full Clipboard API migration is out of
  // scope for plan #4.
  const exec = (cmd: 'cut' | 'copy' | 'paste' | 'selectAll') => {
    try {
      document.execCommand(cmd);
    } catch {
      /* no-op */
    }
    onClose();
  };

  // ---- Formatting commands (work via document.execCommand on contentEditable) ----
  const execFormat = (cmd: 'bold' | 'italic' | 'underline', value?: string) => {
    try {
      document.execCommand(cmd, false, value);
    } catch {
      /* no-op */
    }
    onClose();
  };
  const execHighlight = () => {
    try {
      // hiliteColor sets background of selection; yellow per common editor convention
      document.execCommand('hiliteColor', false, '#FFF59D');
    } catch {
      /* no-op */
    }
    onClose();
  };

  // ---- AI dispatchers ------------------------------------------------------
  const dispatchPolish = () => {
    if (!selection) return;
    openTab('voice-diff', '看墨 · 润色', { mode: 'polish', selection });
    onClose();
  };
  const dispatchContinue = () => {
    if (!selection) return;
    openTab('voice-diff', '看墨 · 续写', { mode: 'fill', selection });
    onClose();
  };
  const dispatchPersona = (mode: 'auto' | 'pick' | 'recent') => {
    if (!selection) return;
    openTab('persona', '看文 · 读者团', { mode, selection });
    onClose();
  };
  const dispatchDebate = () => {
    if (!selection) return;
    openTab('debate', '看辩席 · 正反对论', { selection });
    onClose();
  };
  const dispatchResearch = () => {
    if (!selection) return;
    openTab('research', '看水 · 查证', { selection });
    onClose();
  };
  const dispatchVault = () => {
    openTab('vault', '看典 · 档案库', {});
    onClose();
  };
  const dispatchTrends = () => {
    openTab('trends', '看势 · 热榜', {});
    onClose();
  };
  const dispatchStats = () => {
    openTab('stats', '看镜 · 数据', {});
    onClose();
  };
  const dispatchCompliance = () => {
    if (!selection) return;
    // TODO plan #10 — wire 看心 console + ProvenanceStore counters
    console.log('[看心] compliance review (plan #10):', selection.text);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: MENU_W,
        background: 'rgba(248,248,247,0.96)',
        backdropFilter: 'blur(20px) saturate(1.4)',
        borderRadius: 8,
        boxShadow:
          '0 12px 40px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
        padding: '5px 0',
        fontFamily: '"Noto Sans SC", -apple-system, "PingFang SC", sans-serif',
        fontSize: 13,
        color: '#1A1F2A',
        zIndex: 1000,
        userSelect: 'none',
      }}
    >
      {/* Native section */}
      <MenuItem label="剪切" shortcut="Ctrl+X" disabled={!hasSelection} onClick={() => exec('cut')} />
      <MenuItem label="复制" shortcut="Ctrl+C" disabled={!hasSelection} onClick={() => exec('copy')} />
      <MenuItem label="粘贴" shortcut="Ctrl+V" onClick={() => exec('paste')} />
      <MenuItem label="全选" shortcut="Ctrl+A" onClick={() => exec('selectAll')} />

      <Divider />

      {/* Formatting section */}
      <MenuItem label="加粗" shortcut="Ctrl+B" disabled={!hasSelection} onClick={() => execFormat('bold')} />
      <MenuItem label="斜体" shortcut="Ctrl+I" disabled={!hasSelection} onClick={() => execFormat('italic')} />
      <MenuItem label="下划线" shortcut="Ctrl+U" disabled={!hasSelection} onClick={() => execFormat('underline')} />
      <MenuItem label="高亮" shortcut="Ctrl+H" disabled={!hasSelection} onClick={execHighlight} />

      <Divider />

      {/* AI label header */}
      <div
        style={{
          padding: '4px 14px 2px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: '#7A8595',
        }}
      >
        看山书房 · AI
      </div>

      <MenuItem
        icon={<FoxDot id="mo" enabled={hasSelection} />}
        label="让看墨润色"
        shortcut="Ctrl+Shift+M"
        disabled={!hasSelection}
        accentColor={FOX_BY_ID.mo.glow}
        onClick={dispatchPolish}
      />
      <MenuItem
        icon={<FoxDot id="mo" enabled={hasSelection} />}
        label="让看墨续写"
        disabled={!hasSelection}
        accentColor={FOX_BY_ID.mo.glow}
        onClick={dispatchContinue}
      />

      <Divider dim />

      <div
        onMouseEnter={() => setSubmenuOpenIndex(0)}
        onMouseLeave={() => setSubmenuOpenIndex(null)}
        style={{ position: 'relative' }}
      >
        <MenuItem
          icon={<FoxDot id="wen" enabled={hasSelection} />}
          label="召集读者团"
          shortcut="Ctrl+Shift+R"
          disabled={!hasSelection}
          accentColor={FOX_BY_ID.wen.glow}
          onClick={() => {
            /* submenu owns the action */
          }}
          submenu={
            submenuOpenIndex === 0 && hasSelection ? (
              <Submenu
                items={[
                  { label: '默认四人格 · 自动配置', onClick: () => dispatchPersona('auto') },
                  { label: '自选人格…', onClick: () => dispatchPersona('pick') },
                  {
                    label: '近期常用：业内行家 + 路人读者',
                    onClick: () => dispatchPersona('recent'),
                  },
                ]}
              />
            ) : null
          }
        />
      </div>

      <MenuItem
        icon={<FoxDot id="wen" enabled={hasSelection} />}
        label="请看辩开场"
        disabled={!hasSelection}
        accentColor={FOX_BY_ID.wen.glow}
        onClick={dispatchDebate}
      />

      <Divider dim />

      <MenuItem
        icon={<FoxDot id="shui" enabled={hasSelection} />}
        label="让看水查证"
        shortcut="Ctrl+Shift+F"
        disabled={!hasSelection}
        accentColor={FOX_BY_ID.shui.glow}
        onClick={dispatchResearch}
      />
      <MenuItem
        icon={<FoxDot id="dian" enabled={true} />}
        label="让看典找旧文"
        accentColor={FOX_BY_ID.dian.glow}
        onClick={dispatchVault}
      />

      <Divider dim />

      <MenuItem
        icon={<FoxDot id="shi" enabled={true} />}
        label="问看势热榜"
        accentColor={FOX_BY_ID.shi.glow}
        onClick={dispatchTrends}
      />
      <MenuItem
        icon={<FoxDot id="jing" enabled={true} />}
        label="问看镜看看"
        accentColor={FOX_BY_ID.jing.glow}
        onClick={dispatchStats}
      />
      <MenuItem
        icon={<FoxDot id="xin" enabled={hasSelection} />}
        label="让看心审一审"
        disabled={!hasSelection}
        accentColor={FOX_BY_ID.xin.glow}
        onClick={dispatchCompliance}
      />
    </div>
  );
}
