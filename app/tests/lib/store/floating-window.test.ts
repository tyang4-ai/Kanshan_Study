import { describe, it, expect, beforeEach } from 'vitest';
import { useFloatingWindowStore } from '@/lib/store/floating-window';

describe('useFloatingWindowStore', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    useFloatingWindowStore.setState({
      open: false,
      pos: { x: 240, y: 80 },
      size: { w: 480, h: 600 },
      tabs: [],
      activeTabId: null,
    });
  });

  it('openTab opens the window and adds the tab', () => {
    useFloatingWindowStore.getState().openTab('vault', '档案');
    const state = useFloatingWindowStore.getState();
    expect(state.open).toBe(true);
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].kind).toBe('vault');
    expect(state.activeTabId).toBe(state.tabs[0].id);
  });

  it('reopening any kind dedups to one tab and refreshes title + props', () => {
    useFloatingWindowStore.getState().openTab('vault', 'A');
    useFloatingWindowStore.getState().openTab('vault', 'B');
    expect(useFloatingWindowStore.getState().tabs).toHaveLength(1);
    expect(useFloatingWindowStore.getState().tabs[0].title).toBe('B');
  });

  it('reopening a multi-instance kind also dedups (one tab per kind)', () => {
    useFloatingWindowStore.getState().openTab('persona', 'A', { mode: 'first' });
    useFloatingWindowStore.getState().openTab('persona', 'B', { mode: 'second' });
    const tabs = useFloatingWindowStore.getState().tabs;
    expect(tabs).toHaveLength(1);
    expect(tabs[0].title).toBe('B');
    expect(tabs[0].props).toEqual({ mode: 'second' });
  });

  it('closeTab on active tab focuses last remaining', () => {
    useFloatingWindowStore.getState().openTab('persona', 'A');
    useFloatingWindowStore.getState().openTab('debate', 'B');
    const ids = useFloatingWindowStore.getState().tabs.map((t) => t.id);
    useFloatingWindowStore.getState().closeTab(ids[1]);
    expect(useFloatingWindowStore.getState().activeTabId).toBe(ids[0]);
  });

  it('closeTab on last tab closes the window', () => {
    useFloatingWindowStore.getState().openTab('vault', 'A');
    const id = useFloatingWindowStore.getState().tabs[0].id;
    useFloatingWindowStore.getState().closeTab(id);
    const s = useFloatingWindowStore.getState();
    expect(s.open).toBe(false);
    expect(s.tabs).toEqual([]);
    expect(s.activeTabId).toBeNull();
  });

  it('resize clamps below min', () => {
    useFloatingWindowStore.getState().resize(100, 100);
    const { size } = useFloatingWindowStore.getState();
    expect(size.w).toBe(340);
    expect(size.h).toBe(360);
  });

  it('resize clamps above max (window.innerHeight - 60 = 740)', () => {
    useFloatingWindowStore.getState().resize(2000, 2000);
    const { size } = useFloatingWindowStore.getState();
    expect(size.w).toBe(1100);
    expect(size.h).toBe(740);
  });

  it('movePos updates position', () => {
    useFloatingWindowStore.getState().movePos(500, 200);
    expect(useFloatingWindowStore.getState().pos).toEqual({ x: 500, y: 200 });
  });

  it('focusTab opens the window', () => {
    useFloatingWindowStore.getState().openTab('vault', 'A');
    useFloatingWindowStore.setState({ open: false });
    const id = useFloatingWindowStore.getState().tabs[0].id;
    useFloatingWindowStore.getState().focusTab(id);
    expect(useFloatingWindowStore.getState().open).toBe(true);
    expect(useFloatingWindowStore.getState().activeTabId).toBe(id);
  });

  it('closeWindow clears tabs and activeTabId so next openTab starts fresh', () => {
    useFloatingWindowStore.getState().openTab('vault', 'A');
    useFloatingWindowStore.getState().openTab('settings', 'B');
    useFloatingWindowStore.getState().closeWindow();
    const s = useFloatingWindowStore.getState();
    expect(s.open).toBe(false);
    expect(s.tabs).toEqual([]);
    expect(s.activeTabId).toBeNull();
  });

  it('reopening after closeWindow shows only the newly-clicked tab', () => {
    useFloatingWindowStore.getState().openTab('vault', 'A');
    useFloatingWindowStore.getState().openTab('settings', 'B');
    useFloatingWindowStore.getState().closeWindow();
    useFloatingWindowStore.getState().openTab('stats', 'C');
    const s = useFloatingWindowStore.getState();
    expect(s.open).toBe(true);
    expect(s.tabs).toHaveLength(1);
    expect(s.tabs[0].kind).toBe('stats');
  });
});
