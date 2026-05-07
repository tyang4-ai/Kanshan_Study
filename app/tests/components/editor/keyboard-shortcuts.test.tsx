import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { useEffect, useRef } from 'react';
import {
  useGlobalShortcuts,
  type ShortcutSelection,
} from '@/components/workspace/useGlobalShortcuts';
import { useFloatingWindowStore } from '@/lib/store/floating-window';

const resetStore = () => {
  useFloatingWindowStore.setState({
    open: false,
    tabs: [],
    activeTabId: null,
    pos: { x: 100, y: 100 },
    size: { w: 600, h: 500 },
  });
};

function Harness({ selection }: { selection: ShortcutSelection }) {
  const ref = useRef<ShortcutSelection>(null);
  useEffect(() => {
    ref.current = selection;
  }, [selection]);
  useGlobalShortcuts(ref);
  return null;
}

const fakeRect = () => new DOMRect(0, 0, 10, 10);

beforeEach(() => {
  resetStore();
  Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true });
});

afterEach(() => cleanup());

describe('useGlobalShortcuts (A1)', () => {
  it('Ctrl+Shift+M is preventDefault\'d so no literal "m" reaches the editor', () => {
    render(<Harness selection={null} />);
    const ev = new KeyboardEvent('keydown', {
      key: 'm', ctrlKey: true, shiftKey: true,
      bubbles: true, cancelable: true,
    });
    const preventSpy = vi.spyOn(ev, 'preventDefault');
    const stopSpy = vi.spyOn(ev, 'stopPropagation');
    act(() => { window.dispatchEvent(ev); });
    expect(preventSpy).toHaveBeenCalled();
    expect(stopSpy).toHaveBeenCalled();
  });

  it('Ctrl+Shift+M with selection opens voice-diff polish tab', () => {
    const sel: ShortcutSelection = { text: 'hello', rect: fakeRect() };
    render(<Harness selection={sel} />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'm', ctrlKey: true, shiftKey: true,
        bubbles: true, cancelable: true,
      }));
    });
    const state = useFloatingWindowStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].kind).toBe('voice-diff');
    expect(state.tabs[0].props).toMatchObject({ mode: 'polish' });
  });

  it('Ctrl+Shift+R with selection opens persona auto tab', () => {
    const sel: ShortcutSelection = { text: 'hello', rect: fakeRect() };
    render(<Harness selection={sel} />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'R', ctrlKey: true, shiftKey: true,
        bubbles: true, cancelable: true,
      }));
    });
    const state = useFloatingWindowStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].kind).toBe('persona');
    expect(state.tabs[0].props).toMatchObject({ mode: 'auto' });
  });

  it('Ctrl+Shift+F with selection opens research tab', () => {
    const sel: ShortcutSelection = { text: 'hello', rect: fakeRect() };
    render(<Harness selection={sel} />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'f', ctrlKey: true, shiftKey: true,
        bubbles: true, cancelable: true,
      }));
    });
    const state = useFloatingWindowStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].kind).toBe('research');
  });

  it('IME composition (isComposing=true) bypasses handler', () => {
    const sel: ShortcutSelection = { text: 'hello', rect: fakeRect() };
    render(<Harness selection={sel} />);
    const ev = new KeyboardEvent('keydown', {
      key: 'm', ctrlKey: true, shiftKey: true,
      bubbles: true, cancelable: true,
    });
    Object.defineProperty(ev, 'isComposing', { value: true });
    const preventSpy = vi.spyOn(ev, 'preventDefault');
    act(() => { window.dispatchEvent(ev); });
    expect(preventSpy).not.toHaveBeenCalled();
    expect(useFloatingWindowStore.getState().tabs).toHaveLength(0);
  });

  it('legacy IME (keyCode === 229) bypasses handler', () => {
    const sel: ShortcutSelection = { text: 'hello', rect: fakeRect() };
    render(<Harness selection={sel} />);
    const ev = new KeyboardEvent('keydown', {
      key: 'm', ctrlKey: true, shiftKey: true, keyCode: 229,
      bubbles: true, cancelable: true,
    });
    const preventSpy = vi.spyOn(ev, 'preventDefault');
    act(() => { window.dispatchEvent(ev); });
    expect(preventSpy).not.toHaveBeenCalled();
    expect(useFloatingWindowStore.getState().tabs).toHaveLength(0);
  });

  it('Ctrl+M alone (no Shift) is ignored', () => {
    const sel: ShortcutSelection = { text: 'hello', rect: fakeRect() };
    render(<Harness selection={sel} />);
    const ev = new KeyboardEvent('keydown', {
      key: 'm', ctrlKey: true, shiftKey: false,
      bubbles: true, cancelable: true,
    });
    const preventSpy = vi.spyOn(ev, 'preventDefault');
    act(() => { window.dispatchEvent(ev); });
    expect(preventSpy).not.toHaveBeenCalled();
    expect(useFloatingWindowStore.getState().tabs).toHaveLength(0);
  });

  it('plain "m" keypress is ignored (no chord)', () => {
    render(<Harness selection={null} />);
    const ev = new KeyboardEvent('keydown', {
      key: 'm', bubbles: true, cancelable: true,
    });
    const preventSpy = vi.spyOn(ev, 'preventDefault');
    act(() => { window.dispatchEvent(ev); });
    expect(preventSpy).not.toHaveBeenCalled();
  });

  it('shortcut is swallowed (preventDefault) even with no selection', () => {
    render(<Harness selection={null} />);
    const ev = new KeyboardEvent('keydown', {
      key: 'm', ctrlKey: true, shiftKey: true,
      bubbles: true, cancelable: true,
    });
    const preventSpy = vi.spyOn(ev, 'preventDefault');
    act(() => { window.dispatchEvent(ev); });
    expect(preventSpy).toHaveBeenCalled();
    // But no tab opens because selection is null
    expect(useFloatingWindowStore.getState().tabs).toHaveLength(0);
  });

  it('handler is registered on capture phase (fires before bubble listeners)', () => {
    const sel: ShortcutSelection = { text: 'hello', rect: fakeRect() };
    render(<Harness selection={sel} />);
    let bubbleFired = false;
    let captureFiredFirst = false;
    const bubbleListener = () => {
      bubbleFired = true;
    };
    window.addEventListener('keydown', bubbleListener);
    const ev = new KeyboardEvent('keydown', {
      key: 'm', ctrlKey: true, shiftKey: true,
      bubbles: true, cancelable: true,
    });
    const origPreventDefault = ev.preventDefault.bind(ev);
    ev.preventDefault = () => {
      // capture-phase handler ran before bubble listener saw it
      if (!bubbleFired) captureFiredFirst = true;
      origPreventDefault();
    };
    act(() => { window.dispatchEvent(ev); });
    window.removeEventListener('keydown', bubbleListener);
    expect(captureFiredFirst).toBe(true);
  });

  it('handler is removed on unmount', () => {
    const sel: ShortcutSelection = { text: 'hello', rect: fakeRect() };
    const { unmount } = render(<Harness selection={sel} />);
    unmount();
    const ev = new KeyboardEvent('keydown', {
      key: 'm', ctrlKey: true, shiftKey: true,
      bubbles: true, cancelable: true,
    });
    const preventSpy = vi.spyOn(ev, 'preventDefault');
    act(() => { window.dispatchEvent(ev); });
    expect(preventSpy).not.toHaveBeenCalled();
  });
});
