import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { TabbedFloatingWindow } from '@/components/floating/TabbedFloatingWindow';
import { useFloatingWindowStore, type Tab } from '@/lib/store/floating-window';

const baseTab = (id: string, kind: Tab['kind'], title: string): Tab => ({
  id,
  kind,
  title,
  props: {},
});

const resetStore = (overrides: Partial<ReturnType<typeof useFloatingWindowStore.getState>> = {}) => {
  useFloatingWindowStore.setState({
    open: false,
    tabs: [],
    activeTabId: null,
    pos: { x: 100, y: 100 },
    size: { w: 600, h: 500 },
    ...overrides,
  });
};

describe('TabbedFloatingWindow', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    resetStore();
  });

  it('renders nothing when open=false', () => {
    resetStore({ open: false, tabs: [] });
    const { container } = render(<TabbedFloatingWindow />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when tabs=[] even if open=true', () => {
    resetStore({ open: true, tabs: [], activeTabId: null });
    const { container } = render(<TabbedFloatingWindow />);
    expect(container.firstChild).toBeNull();
  });

  it('renders with 1 tab and shows its title in the pill', () => {
    const tab = baseTab('x', 'vault', '看典 · 档案库');
    resetStore({ open: true, tabs: [tab], activeTabId: 'x' });
    render(<TabbedFloatingWindow />);
    expect(screen.getByText('看典 · 档案库')).toBeInTheDocument();
  });

  it('renders body content asynchronously via next/dynamic', async () => {
    const tab = baseTab('x', 'vault', '看典 · 档案库');
    resetStore({ open: true, tabs: [tab], activeTabId: 'x' });
    render(<TabbedFloatingWindow />);
    expect(await screen.findByText(/TODO: vault/)).toBeInTheDocument();
  });

  it('clicking a tab pill switches active tab', () => {
    const t1 = baseTab('a', 'vault', '看典 · 档案库');
    const t2 = baseTab('b', 'settings', '设置');
    resetStore({ open: true, tabs: [t1, t2], activeTabId: 'a' });
    render(<TabbedFloatingWindow />);
    fireEvent.click(screen.getByText('设置'));
    expect(useFloatingWindowStore.getState().activeTabId).toBe('b');
  });

  it('clicking the close X on a tab closes only that tab', () => {
    const t1 = baseTab('a', 'vault', '看典 · 档案库');
    const t2 = baseTab('b', 'settings', '设置');
    resetStore({ open: true, tabs: [t1, t2], activeTabId: 'a' });
    render(<TabbedFloatingWindow />);
    const pillCloseButtons = screen.getAllByTitle('关闭标签');
    fireEvent.click(pillCloseButtons[0]);
    const state = useFloatingWindowStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].id).toBe('b');
  });

  it('closing the last tab closes the whole window', () => {
    const tab = baseTab('only', 'vault', '看典 · 档案库');
    resetStore({ open: true, tabs: [tab], activeTabId: 'only' });
    render(<TabbedFloatingWindow />);
    fireEvent.click(screen.getByTitle('关闭标签'));
    const state = useFloatingWindowStore.getState();
    expect(state.open).toBe(false);
    expect(state.tabs).toHaveLength(0);
    expect(state.activeTabId).toBeNull();
  });

  it('clicking the window close button closes the window', () => {
    const tab = baseTab('x', 'vault', '看典 · 档案库');
    resetStore({ open: true, tabs: [tab], activeTabId: 'x' });
    render(<TabbedFloatingWindow />);
    fireEvent.click(screen.getByTitle('关闭窗口'));
    expect(useFloatingWindowStore.getState().open).toBe(false);
  });

  it('header drag updates pos by the mouse delta', () => {
    const tab = baseTab('x', 'vault', '看典 · 档案库');
    resetStore({ open: true, tabs: [tab], activeTabId: 'x', pos: { x: 100, y: 100 } });
    render(<TabbedFloatingWindow />);
    const pillText = screen.getByText('看典 · 档案库');
    const header = pillText.closest('div')!.parentElement!.parentElement!;
    act(() => {
      fireEvent.mouseDown(header, { clientX: 100, clientY: 100 });
    });
    act(() => {
      fireEvent.mouseMove(document, { clientX: 200, clientY: 150 });
    });
    act(() => {
      fireEvent.mouseUp(document);
    });
    const { pos } = useFloatingWindowStore.getState();
    expect(pos.x).toBe(200);
    expect(pos.y).toBe(150);
  });

  it('header drag is NOT triggered when mousedown originates on a button', () => {
    const tab = baseTab('x', 'vault', '看典 · 档案库');
    resetStore({ open: true, tabs: [tab], activeTabId: 'x', pos: { x: 100, y: 100 } });
    render(<TabbedFloatingWindow />);
    const closeBtn = screen.getByTitle('关闭窗口');
    act(() => {
      fireEvent.mouseDown(closeBtn, { clientX: 100, clientY: 100 });
    });
    act(() => {
      fireEvent.mouseMove(document, { clientX: 500, clientY: 500 });
    });
    act(() => {
      fireEvent.mouseUp(document);
    });
    const { pos } = useFloatingWindowStore.getState();
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(100);
  });

  it('resize handle updates size through the store', () => {
    const tab = baseTab('x', 'vault', '看典 · 档案库');
    resetStore({ open: true, tabs: [tab], activeTabId: 'x', size: { w: 600, h: 500 } });
    render(<TabbedFloatingWindow />);
    const handle = screen.getByTitle('拖动调整窗口大小');
    act(() => {
      fireEvent.mouseDown(handle, { clientX: 700, clientY: 600 });
    });
    act(() => {
      fireEvent.mouseMove(document, { clientX: 750, clientY: 650 });
    });
    act(() => {
      fireEvent.mouseUp(document);
    });
    const { size } = useFloatingWindowStore.getState();
    expect(size.w).toBeGreaterThanOrEqual(600);
    expect(size.h).toBeGreaterThanOrEqual(500);
  });
});
