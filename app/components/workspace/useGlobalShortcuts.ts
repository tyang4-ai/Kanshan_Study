'use client';
import { useEffect, type RefObject } from 'react';
import { useFloatingWindowStore } from '@/lib/store/floating-window';

export type ShortcutSelection = { text: string; rect: DOMRect } | null;

/**
 * Global keyboard shortcuts for the workspace AI tools.
 *
 * Registered on `window` capture-phase so the chord is swallowed BEFORE the
 * contentEditable receives it — otherwise pressing Ctrl+Shift+M while the
 * editor has focus inserts a literal "m" before our handler runs.
 *
 * IME guard: bails on `isComposing` / `keyCode === 229` so chords pressed
 * mid-composition don't fire.
 */
export function useGlobalShortcuts(selectionRef: RefObject<ShortcutSelection>) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (!e.ctrlKey || !e.shiftKey) return;
      const key = e.key.toLowerCase();
      // r5 TASK F (颜鑫 P1): added 'k' for 看山 chat — demo-flow doc Step 0
      // tells judges to press Ctrl+Shift+K to open the orchestration panel.
      // 'k' is the only chord that doesn't require a selection.
      if (key !== 'm' && key !== 'r' && key !== 'f' && key !== 'k') return;
      // Swallow the chord even if no selection — the literal letter must never
      // reach the contentEditable.
      e.preventDefault();
      e.stopPropagation();
      const { openTab } = useFloatingWindowStore.getState();
      if (key === 'k') {
        // 看山 doesn't need a selection.
        openTab('kanshan-chat', '看山 · 编排');
        return;
      }
      const sel = selectionRef.current;
      if (!sel) return;
      if (key === 'm') {
        openTab('voice-diff', '看墨 · 润色', { mode: 'polish', selection: sel });
      } else if (key === 'r') {
        openTab('persona', '看文 · 读者团', { mode: 'auto', selection: sel });
      } else if (key === 'f') {
        openTab('research', '看水 · 查证', { selection: sel });
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [selectionRef]);
}
