import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { TOUR_STEPS } from '@/lib/tour/steps';
import { LeftRail } from '@/components/rail/LeftRail';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { TabbedFloatingWindow } from '@/components/floating/TabbedFloatingWindow';
import { FoxRail } from '@/components/atoms/FoxRail';
import { LoreEnvelope } from '@/components/rail/LoreEnvelope';
import { TitleBar } from '@/components/chrome/TitleBar';
import { useFloatingWindowStore } from '@/lib/store/floating-window';

// TipTap's openTab dependency — mock at module level (matches existing
// tests/components/editor/tiptap-editor.test.tsx pattern).
const openTabMock = vi.fn();
vi.mock('@/lib/store/floating-window', async () => {
  const actual = await vi.importActual<typeof import('@/lib/store/floating-window')>(
    '@/lib/store/floating-window',
  );
  return actual;
});

beforeEach(() => {
  openTabMock.mockClear();
  // Seed the floating window store with one open tab so TabbedFloatingWindow
  // actually renders something (otherwise it returns null).
  useFloatingWindowStore.setState({
    open: true,
    pos: { x: 100, y: 100 },
    size: { w: 600, h: 500 },
    tabs: [{ id: 't1', kind: 'vault', title: '看典', props: {} }],
    activeTabId: 't1',
  });
});

afterEach(() => {
  cleanup();
  useFloatingWindowStore.setState({
    open: false,
    tabs: [],
    activeTabId: null,
    pos: { x: 100, y: 100 },
    size: { w: 600, h: 500 },
  });
});

function selectorValue(step: typeof TOUR_STEPS[number]): string | null {
  const m = step.selector.match(/data-tour-id="([^"]+)"/);
  return m ? m[1] : null;
}

describe('data-tour-id wiring', () => {
  it('LeftRail outer wrapper carries data-tour-id="left-rail"', () => {
    const { container } = render(<LeftRail />);
    expect(container.querySelector('[data-tour-id="left-rail"]')).not.toBeNull();
  });

  it('TipTapEditor outer wrapper carries data-tour-id="editor"', () => {
    const { container } = render(<TipTapEditor content="<p>hi</p>" />);
    expect(container.querySelector('[data-tour-id="editor"]')).not.toBeNull();
  });

  it('TabbedFloatingWindow outer container carries data-tour-id="floating-window"', () => {
    const { container } = render(<TabbedFloatingWindow />);
    expect(container.querySelector('[data-tour-id="floating-window"]')).not.toBeNull();
  });

  it('FoxRail outer div carries data-tour-id="fox-tails"', () => {
    const { container } = render(<FoxRail activeIds={['mo']} onPick={() => {}} />);
    expect(container.querySelector('[data-tour-id="fox-tails"]')).not.toBeNull();
  });

  it('LoreEnvelope button carries data-tour-id="lore-envelope"', () => {
    const { container } = render(<LoreEnvelope onClick={() => {}} />);
    const el = container.querySelector('[data-tour-id="lore-envelope"]');
    expect(el).not.toBeNull();
    expect(el?.tagName.toLowerCase()).toBe('button');
  });

  it('TitleBar exposes settings-button + stats-button', () => {
    const { container } = render(<TitleBar />);
    expect(container.querySelector('[data-tour-id="settings-button"]')).not.toBeNull();
    expect(container.querySelector('[data-tour-id="stats-button"]')).not.toBeNull();
  });

  it('every TOUR_STEPS selector resolves on a composed mount', () => {
    // Render every host together so the engine's querySelector calls would all
    // resolve. We use a wrapping div from `render` to scope queries.
    const { container } = render(
      <>
        <TitleBar />
        <LeftRail />
        <TipTapEditor content="<p>hi</p>" />
        <TabbedFloatingWindow />
        <FoxRail activeIds={['mo']} onPick={() => {}} />
        <LoreEnvelope onClick={() => {}} />
      </>,
    );

    for (const step of TOUR_STEPS) {
      const id = selectorValue(step);
      expect(id, `step ${step.id} must use data-tour-id selector`).not.toBeNull();
      // The lore-final step reuses the lore-envelope anchor — that's expected.
      expect(
        container.querySelector(step.selector),
        `selector ${step.selector} (step ${step.id}) must resolve`,
      ).not.toBeNull();
    }
  });
});
