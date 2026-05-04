import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FormatRibbon } from '@/components/editor/FormatRibbon';
import { useEditorStore } from '@/lib/store/editor';
import type { Editor } from '@tiptap/react';

interface FakeChain {
  focus: () => FakeChain;
  toggleBold: () => FakeChain;
  toggleItalic: () => FakeChain;
  toggleUnderline: () => FakeChain;
  toggleStrike: () => FakeChain;
  toggleHighlight: (a: { color: string }) => FakeChain;
  unsetHighlight: () => FakeChain;
  setColor: (c: string) => FakeChain;
  unsetColor: () => FakeChain;
  setFontSize: (s: string) => FakeChain;
  unsetFontSize: () => FakeChain;
  setFontFamily: (f: string) => FakeChain;
  unsetFontFamily: () => FakeChain;
  run: () => boolean;
}

function makeFakeEditor(activeMap: Record<string, boolean> = {}, attrsMap: Record<string, Record<string, string>> = {}): {
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
    setFontFamily: (f) => { calls.push(['setFontFamily', f]); return chain; },
    unsetFontFamily: () => { calls.push(['unsetFontFamily']); return chain; },
    run: () => true,
  };
  const fake = {
    chain: () => chain,
    isActive: (name: string) => !!activeMap[name],
    getAttributes: (name: string) => attrsMap[name] ?? {},
    on: () => fake,
    off: () => fake,
  } as unknown as Editor;
  return { editor: fake, calls };
}

beforeEach(() => {
  useEditorStore.setState({ editor: null });
});
afterEach(() => cleanup());

describe('FormatRibbon', () => {
  it('disables controls when editor not mounted', () => {
    render(<FormatRibbon />);
    expect(screen.getByTestId('format-font')).toBeDisabled();
    expect(screen.getByTestId('format-size')).toBeDisabled();
    expect(screen.getByTestId('ribbon-bold')).toBeDisabled();
  });

  it('bold/italic/underline/strike each dispatch their toggle', () => {
    const { editor, calls } = makeFakeEditor();
    useEditorStore.setState({ editor });
    render(<FormatRibbon />);
    fireEvent.click(screen.getByTestId('ribbon-bold'));
    fireEvent.click(screen.getByTestId('ribbon-italic'));
    fireEvent.click(screen.getByTestId('ribbon-underline'));
    fireEvent.click(screen.getByTestId('ribbon-strike'));
    const names = calls.map(([k]) => k);
    expect(names).toContain('toggleBold');
    expect(names).toContain('toggleItalic');
    expect(names).toContain('toggleUnderline');
    expect(names).toContain('toggleStrike');
  });

  it('font dropdown opens, click 黑体 dispatches setFontFamily', () => {
    const { editor, calls } = makeFakeEditor();
    useEditorStore.setState({ editor });
    render(<FormatRibbon />);
    fireEvent.click(screen.getByTestId('format-font'));
    expect(screen.getByTestId('font-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('font-黑体'));
    const found = calls.find(([k]) => k === 'setFontFamily');
    expect(found).toBeTruthy();
    expect(typeof found?.[1]).toBe('string');
    expect((found?.[1] as string).toLowerCase()).toContain('sans');
  });

  it('size dropdown opens, click 22px dispatches setFontSize("22px")', () => {
    const { editor, calls } = makeFakeEditor();
    useEditorStore.setState({ editor });
    render(<FormatRibbon />);
    fireEvent.click(screen.getByTestId('format-size'));
    expect(screen.getByTestId('size-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('size-22px'));
    const found = calls.find(([k]) => k === 'setFontSize');
    expect(found?.[1]).toBe('22px');
  });

  it('color panel opens, click cell dispatches setColor', () => {
    const { editor, calls } = makeFakeEditor();
    useEditorStore.setState({ editor });
    render(<FormatRibbon />);
    fireEvent.click(screen.getByTestId('format-color-trigger'));
    expect(screen.getByTestId('color-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('color-cell-#C03028'));
    const found = calls.find(([k]) => k === 'setColor');
    expect(found?.[1]).toBe('#C03028');
  });

  it('color clear dispatches unsetColor', () => {
    const { editor, calls } = makeFakeEditor();
    useEditorStore.setState({ editor });
    render(<FormatRibbon />);
    fireEvent.click(screen.getByTestId('format-color-trigger'));
    fireEvent.click(screen.getByTestId('color-clear'));
    expect(calls.some(([k]) => k === 'unsetColor')).toBe(true);
  });

  it('highlight panel cell dispatches toggleHighlight', () => {
    const { editor, calls } = makeFakeEditor();
    useEditorStore.setState({ editor });
    render(<FormatRibbon />);
    fireEvent.click(screen.getByTestId('format-highlight-trigger'));
    expect(screen.getByTestId('highlight-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('highlight-cell-黄'));
    const found = calls.find(([k]) => k === 'toggleHighlight');
    expect(found?.[1]).toEqual({ color: '#FFF59D' });
  });

  it('highlight clear dispatches unsetHighlight', () => {
    const { editor, calls } = makeFakeEditor();
    useEditorStore.setState({ editor });
    render(<FormatRibbon />);
    fireEvent.click(screen.getByTestId('format-highlight-trigger'));
    fireEvent.click(screen.getByTestId('highlight-clear'));
    expect(calls.some(([k]) => k === 'unsetHighlight')).toBe(true);
  });

  it('current font label reflects editor.getAttributes', () => {
    const { editor } = makeFakeEditor({}, {
      textStyle: { fontFamily: '"Noto Sans SC", "Source Han Sans SC", sans-serif' },
    });
    useEditorStore.setState({ editor });
    render(<FormatRibbon />);
    expect(screen.getByTestId('format-font')).toHaveTextContent('黑体');
  });

  it('active state reflects editor.isActive', () => {
    const { editor } = makeFakeEditor({ bold: true });
    useEditorStore.setState({ editor });
    render(<FormatRibbon />);
    expect(screen.getByTestId('ribbon-bold')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('ribbon-italic')).toHaveAttribute('data-active', 'false');
  });
});
