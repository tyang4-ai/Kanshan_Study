import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { RightToolbar } from '@/components/chrome/RightToolbar';
import { useEditorStore } from '@/lib/store/editor';
import type { Editor } from '@tiptap/react';

const openTabMock = vi.fn();
vi.mock('@/lib/store/floating-window', () => ({
  useFloatingWindowStore: Object.assign(
    (selector: (s: { openTab: typeof openTabMock }) => unknown) =>
      selector({ openTab: openTabMock }),
    { getState: () => ({ openTab: openTabMock }) },
  ),
}));

interface FakeChain {
  focus: () => FakeChain;
  toggleBold: () => FakeChain;
  toggleItalic: () => FakeChain;
  toggleUnderline: () => FakeChain;
  toggleStrike: () => FakeChain;
  toggleHighlight: (attrs: { color: string }) => FakeChain;
  unsetHighlight: () => FakeChain;
  setColor: (c: string) => FakeChain;
  unsetColor: () => FakeChain;
  setFontSize: (s: string) => FakeChain;
  unsetFontSize: () => FakeChain;
  run: () => boolean;
}

function makeFakeEditor(activeMap: Record<string, boolean> = {}): {
  editor: Editor;
  calls: Array<[string, unknown?]>;
} {
  const calls: Array<[string, unknown?]> = [];
  const chain: FakeChain = {
    focus: () => chain,
    toggleBold: () => { calls.push(['toggleBold']); return chain; },
    toggleItalic: () => { calls.push(['toggleItalic']); return chain; },
    toggleUnderline: () => { calls.push(['toggleUnderline']); return chain; },
    toggleStrike: () => { calls.push(['toggleStrike']); return chain; },
    toggleHighlight: (a) => { calls.push(['toggleHighlight', a]); return chain; },
    unsetHighlight: () => { calls.push(['unsetHighlight']); return chain; },
    setColor: (c) => { calls.push(['setColor', c]); return chain; },
    unsetColor: () => { calls.push(['unsetColor']); return chain; },
    setFontSize: (s) => { calls.push(['setFontSize', s]); return chain; },
    unsetFontSize: () => { calls.push(['unsetFontSize']); return chain; },
    run: () => true,
  };
  const fake = {
    chain: () => chain,
    isActive: (name: string) => !!activeMap[name],
    on: () => fake,
    off: () => fake,
  } as unknown as Editor;
  return { editor: fake, calls };
}

const fakeRect: DOMRect = {
  left: 0, right: 100, top: 0, bottom: 20, width: 100, height: 20, x: 0, y: 0, toJSON: () => ({}),
};

beforeEach(() => {
  useEditorStore.setState({ editor: null });
  openTabMock.mockClear();
});
afterEach(() => cleanup());

describe('RightToolbar real-editor wiring', () => {
  it('disables format buttons when editor not mounted', () => {
    render(<RightToolbar selection={{ text: 'sample', rect: fakeRect }} />);
    const bold = screen.getByTestId('format-bold');
    expect(bold).toBeDisabled();
  });

  it('disables format buttons when no selection (even with editor)', () => {
    const { editor } = makeFakeEditor();
    useEditorStore.setState({ editor });
    render(<RightToolbar selection={null} />);
    expect(screen.getByTestId('format-bold')).toBeDisabled();
  });

  it('bold button dispatches toggleBold on editor', () => {
    const { editor, calls } = makeFakeEditor();
    useEditorStore.setState({ editor });
    render(<RightToolbar selection={{ text: 's', rect: fakeRect }} />);
    fireEvent.click(screen.getByTestId('format-bold'));
    expect(calls.some(([k]) => k === 'toggleBold')).toBe(true);
  });

  it('italic / underline / strike each dispatch their toggle command', () => {
    const { editor, calls } = makeFakeEditor();
    useEditorStore.setState({ editor });
    render(<RightToolbar selection={{ text: 's', rect: fakeRect }} />);
    fireEvent.click(screen.getByTestId('format-italic'));
    fireEvent.click(screen.getByTestId('format-underline'));
    fireEvent.click(screen.getByTestId('format-strike'));
    const names = calls.map(([k]) => k);
    expect(names).toContain('toggleItalic');
    expect(names).toContain('toggleUnderline');
    expect(names).toContain('toggleStrike');
  });

  it('highlight popover opens, swatch click dispatches toggleHighlight', () => {
    const { editor, calls } = makeFakeEditor();
    useEditorStore.setState({ editor });
    render(<RightToolbar selection={{ text: 's', rect: fakeRect }} />);
    fireEvent.click(screen.getByTestId('format-highlight'));
    expect(screen.getByTestId('highlight-popover')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('highlight-swatch-黄'));
    const found = calls.find(([k]) => k === 'toggleHighlight');
    expect(found).toBeTruthy();
    expect(found?.[1]).toEqual({ color: '#FFF59D' });
  });

  it('highlight clear dispatches unsetHighlight', () => {
    const { editor, calls } = makeFakeEditor();
    useEditorStore.setState({ editor });
    render(<RightToolbar selection={{ text: 's', rect: fakeRect }} />);
    fireEvent.click(screen.getByTestId('format-highlight'));
    fireEvent.click(screen.getByTestId('highlight-swatch-clear'));
    expect(calls.some(([k]) => k === 'unsetHighlight')).toBe(true);
  });

  it('color popover swatch dispatches setColor with the swatch color', () => {
    const { editor, calls } = makeFakeEditor();
    useEditorStore.setState({ editor });
    render(<RightToolbar selection={{ text: 's', rect: fakeRect }} />);
    fireEvent.click(screen.getByTestId('format-color'));
    fireEvent.click(screen.getByTestId('color-swatch-朱红'));
    const found = calls.find(([k]) => k === 'setColor');
    expect(found?.[1]).toBe('#C03028');
  });

  it('color popover default swatch dispatches unsetColor', () => {
    const { editor, calls } = makeFakeEditor();
    useEditorStore.setState({ editor });
    render(<RightToolbar selection={{ text: 's', rect: fakeRect }} />);
    fireEvent.click(screen.getByTestId('format-color'));
    fireEvent.click(screen.getByTestId('color-swatch-默认'));
    expect(calls.some(([k]) => k === 'unsetColor')).toBe(true);
  });

  it('fontsize popover preset dispatches setFontSize', () => {
    const { editor, calls } = makeFakeEditor();
    useEditorStore.setState({ editor });
    render(<RightToolbar selection={{ text: 's', rect: fakeRect }} />);
    fireEvent.click(screen.getByTestId('format-fontsize'));
    fireEvent.click(screen.getByTestId('fontsize-22px'));
    const found = calls.find(([k]) => k === 'setFontSize');
    expect(found?.[1]).toBe('22px');
  });

  it('fontsize clear dispatches unsetFontSize', () => {
    const { editor, calls } = makeFakeEditor();
    useEditorStore.setState({ editor });
    render(<RightToolbar selection={{ text: 's', rect: fakeRect }} />);
    fireEvent.click(screen.getByTestId('format-fontsize'));
    fireEvent.click(screen.getByTestId('fontsize-clear'));
    expect(calls.some(([k]) => k === 'unsetFontSize')).toBe(true);
  });

  it('active state reflects editor.isActive', () => {
    const { editor } = makeFakeEditor({ bold: true });
    useEditorStore.setState({ editor });
    render(<RightToolbar selection={{ text: 's', rect: fakeRect }} />);
    expect(screen.getByTestId('format-bold')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('format-italic')).toHaveAttribute('data-active', 'false');
  });
});
