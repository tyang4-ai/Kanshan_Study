'use client';
import { useRef, useState, useCallback } from 'react';
import { useFloatingWindowStore, type Tab } from '@/lib/store/floating-window';
import { TabBody } from './TabBody';

export function TabbedFloatingWindow() {
  const { open, pos, size, tabs, activeTabId, closeTab, focusTab, closeWindow, movePos, resize } =
    useFloatingWindowStore();
  const dragState = useRef<{ x0: number; y0: number; px: number; py: number } | null>(null);
  const resizeState = useRef<{ x0: number; y0: number; w0: number; h0: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onHeaderDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, input')) return;
      dragState.current = { x0: e.clientX, y0: e.clientY, px: pos.x, py: pos.y };
      setIsDragging(true);
      const onMove = (ev: MouseEvent) => {
        const d = dragState.current;
        if (!d) return;
        movePos(d.px + ev.clientX - d.x0, d.py + ev.clientY - d.y0);
      };
      const onUp = () => {
        dragState.current = null;
        setIsDragging(false);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [pos.x, pos.y, movePos]
  );

  const onResizeDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      resizeState.current = { x0: e.clientX, y0: e.clientY, w0: size.w, h0: size.h };
      const onMove = (ev: MouseEvent) => {
        const r = resizeState.current;
        if (!r) return;
        resize(r.w0 + ev.clientX - r.x0, r.h0 + ev.clientY - r.y0);
      };
      const onUp = () => {
        resizeState.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [size.w, size.h, resize]
  );

  if (!open || tabs.length === 0) return null;
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  return (
    <div
      className="fixed z-[1500] flex flex-col overflow-hidden rounded-[10px] bg-slate-50 shadow-[0_24px_64px_rgba(0,0,0,0.30),0_0_0_0.5px_rgba(0,0,0,0.18)]"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      <div
        onMouseDown={onHeaderDown}
        className="flex shrink-0 select-none items-stretch"
        style={{
          background: 'linear-gradient(180deg, #2C4258 0%, #1F2F40 100%)',
          cursor: isDragging ? 'grabbing' : 'move',
        }}
      >
        <div className="flex flex-1 overflow-x-auto overflow-y-hidden">
          {tabs.map((tab) => (
            <TabPill
              key={tab.id}
              tab={tab}
              active={tab.id === activeTab.id}
              onFocus={() => focusTab(tab.id)}
              onClose={() => closeTab(tab.id)}
            />
          ))}
        </div>
        <button
          onClick={closeWindow}
          className="m-2 h-[22px] w-[22px] shrink-0 rounded-full border-none bg-white/10 p-0 text-sm text-slate-100 hover:bg-white/20"
          title="关闭窗口"
        >
          ×
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <TabBody tab={activeTab} />
      </div>

      <div
        onMouseDown={onResizeDown}
        title="拖动调整窗口大小"
        className="absolute bottom-0 right-0 z-10 h-4 w-4 cursor-nwse-resize"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" className="block">
          <path d="M14 6L6 14 M14 10L10 14" stroke="#7A8B9F" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

function TabPill({
  tab, active, onFocus, onClose,
}: {
  tab: Tab; active: boolean; onFocus: () => void; onClose: () => void;
}) {
  return (
    <div
      onClick={onFocus}
      className={[
        'flex shrink-0 cursor-pointer items-center gap-2 px-3 py-2 text-xs',
        active ? 'bg-slate-50 text-slate-900' : 'text-slate-300 hover:bg-white/5',
      ].join(' ')}
      style={{ fontFamily: '"Noto Serif SC", serif', letterSpacing: 0.5 }}
    >
      <span className="whitespace-nowrap">{tab.title}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="ml-1 opacity-50 hover:opacity-100"
        title="关闭标签"
      >
        ×
      </button>
    </div>
  );
}
