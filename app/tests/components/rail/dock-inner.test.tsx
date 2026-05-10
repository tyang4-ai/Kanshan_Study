import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { FoxMeta, FoxId } from '@/lib/foxes/registry';
import { useFloatingWindowStore } from '@/lib/store/floating-window';

// Mock atoms with attribute-rich placeholders so we can assert dock geometry.
vi.mock('@/components/atoms/Tail', () => ({
  Tail: ({ fox, active, size, rotate, zIndex }: {
    fox: FoxMeta; active: boolean; size: number; rotate: number; zIndex: number;
  }) => (
    <div
      data-testid="tail"
      data-fox={fox.id}
      data-active={String(active)}
      data-size={size}
      data-rotate={rotate}
      data-zindex={zIndex}
    />
  ),
}));
vi.mock('@/components/atoms/ShanFigure', () => ({
  ShanFigure: ({ size, glow }: { size: number; glow?: boolean }) => (
    <div data-testid="shan-figure" data-size={size} data-glow={String(glow)} />
  ),
}));
vi.mock('@/components/atoms/FoxRail', () => ({
  FoxRail: ({ activeIds, onPick }: { activeIds: FoxId[]; onPick: (id: FoxId) => void }) => (
    <div data-testid="fox-rail" data-active={activeIds.join(',')}>
      <button data-testid="fox-rail-mo" onClick={() => onPick('mo')}>mo</button>
      <button data-testid="fox-rail-shi" onClick={() => onPick('shi')}>shi</button>
      <button data-testid="fox-rail-shan" onClick={() => onPick('shan')}>shan</button>
    </div>
  ),
}));

import { DockInner } from '@/components/rail/DockInner';

describe('DockInner', () => {
  it('renders single active fox (mo) with rotate 0 and others invisible', () => {
    const { container } = render(<DockInner activeArr={['mo']} onToggleFox={() => {}} />);
    const tails = container.querySelectorAll('[data-testid="tail"]');
    expect(tails.length).toBe(9);

    const moTail = container.querySelector('[data-fox="mo"]')!;
    expect(moTail.getAttribute('data-active')).toBe('true');
    expect(moTail.getAttribute('data-rotate')).toBe('0');

    // Inactive tails carry data-active="false"
    const shanTail = container.querySelector('[data-fox="shan"]')!;
    expect(shanTail.getAttribute('data-active')).toBe('false');

    // Inactive tails are wrapped in opacity:0 / pointer-events:none parents.
    const inactiveWrapper = shanTail.parentElement!;
    expect(inactiveWrapper.style.opacity).toBe('0');
    expect(inactiveWrapper.style.pointerEvents).toBe('none');
  });

  it('renders two active foxes (mo, wen) with rotates -35 and +35', () => {
    const { container } = render(<DockInner activeArr={['mo', 'wen']} onToggleFox={() => {}} />);
    const moTail = container.querySelector('[data-fox="mo"]')!;
    const wenTail = container.querySelector('[data-fox="wen"]')!;
    expect(moTail.getAttribute('data-active')).toBe('true');
    expect(moTail.getAttribute('data-rotate')).toBe('-35');
    expect(wenTail.getAttribute('data-active')).toBe('true');
    expect(wenTail.getAttribute('data-rotate')).toBe('35');
  });

  it('expands all 9 tails on hover (talk-to + active = 1, tools = 0.7)', () => {
    const { getByTestId, container } = render(
      <DockInner activeArr={['mo']} onToggleFox={() => {}} />
    );

    const hoverTarget = getByTestId('dock-tails-hover');
    fireEvent.mouseEnter(hoverTarget);

    const tails = container.querySelectorAll('[data-testid="tail"]');
    expect(tails.length).toBe(9);

    // Per #13.99: talk-to foxes (shan/wen/wen2/jing) and the active fox stay
    // at opacity 1; tool foxes (mo/shui/dian/shi/xin) are de-emphasized to 0.7.
    // mo is active here so it stays at 1.
    const TALK_TO = new Set(['shan', 'wen', 'wen2', 'jing']);
    tails.forEach((tail) => {
      const foxId = tail.getAttribute('data-fox');
      const wrapper = tail.parentElement!;
      const expected = foxId === 'mo' || (foxId && TALK_TO.has(foxId)) ? '1' : '0.7';
      expect(wrapper.style.opacity).toBe(expected);
    });
  });

  it('does not render the static 看山想想 placeholder input', () => {
    const { container } = render(<DockInner activeArr={['mo']} onToggleFox={() => {}} />);
    expect(container.textContent ?? '').not.toContain('让看山想想');
    expect(container.textContent ?? '').not.toContain('看山想想……');
  });

  it('each tail wrapper has title with fox name + verb', () => {
    const { container } = render(<DockInner activeArr={['mo']} onToggleFox={() => {}} />);
    const moTail = container.querySelector('[data-fox="mo"]')!;
    const moWrapper = moTail.parentElement!;
    expect(moWrapper.getAttribute('title')).toBe('看墨 · 内容精加工');

    const shuiTail = container.querySelector('[data-fox="shui"]')!;
    expect(shuiTail.parentElement!.getAttribute('title')).toBe('看水 · 灵感激发');
  });

  describe('click → toggleFox + open tab', () => {
    beforeEach(() => {
      useFloatingWindowStore.setState({
        open: false,
        tabs: [],
        activeTabId: null,
      });
    });

    const cases: Array<{ id: FoxId; expectedKind: string | null }> = [
      { id: 'mo', expectedKind: 'voice-diff' },
      { id: 'wen', expectedKind: 'debate' },
      { id: 'wen2', expectedKind: 'debate' },
      { id: 'shui', expectedKind: 'research' },
      { id: 'dian', expectedKind: 'vault' },
      { id: 'shi', expectedKind: 'trends' },
      { id: 'jing', expectedKind: 'stats' },
      { id: 'shan', expectedKind: null },
      { id: 'xin', expectedKind: null },
    ];

    for (const { id, expectedKind } of cases) {
      it(`click on ${id} → toggleFox(${id}) and ${expectedKind ?? 'no tab'}`, () => {
        const onToggle = vi.fn();
        // Render with an active set wide enough that the clicked fox is visible.
        const { container, getByTestId } = render(
          <DockInner activeArr={['mo']} onToggleFox={onToggle} />,
        );
        // Expand the dock so all tails get pointer-events
        fireEvent.mouseEnter(getByTestId('dock-tails-hover'));
        const tail = container.querySelector(`[data-fox="${id}"]`)!;
        fireEvent.click(tail.parentElement!);
        expect(onToggle).toHaveBeenCalledWith(id);
        const tabs = useFloatingWindowStore.getState().tabs;
        if (expectedKind === null) {
          expect(tabs).toHaveLength(0);
        } else {
          expect(tabs).toHaveLength(1);
          expect(tabs[0].kind).toBe(expectedKind);
        }
      });
    }

    it('FoxRail icon click on 看墨 → opens voice-diff tab AND toggles fox AND store.open is true', () => {
      const onToggle = vi.fn();
      const { getByTestId } = render(
        <DockInner activeArr={['mo']} onToggleFox={onToggle} />,
      );
      fireEvent.click(getByTestId('fox-rail-mo'));
      expect(onToggle).toHaveBeenCalledWith('mo');
      const state = useFloatingWindowStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].kind).toBe('voice-diff');
      expect(state.open).toBe(true);
    });

    it('FoxRail icon click on 看势 → opens trends tab', () => {
      const onToggle = vi.fn();
      const { getByTestId } = render(
        <DockInner activeArr={['mo']} onToggleFox={onToggle} />,
      );
      fireEvent.click(getByTestId('fox-rail-shi'));
      expect(onToggle).toHaveBeenCalledWith('shi');
      const state = useFloatingWindowStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].kind).toBe('trends');
      expect(state.open).toBe(true);
    });

    it('FoxRail icon click on 看山 → toggles fox but does NOT open a tab', () => {
      const onToggle = vi.fn();
      const { getByTestId } = render(
        <DockInner activeArr={['mo']} onToggleFox={onToggle} />,
      );
      fireEvent.click(getByTestId('fox-rail-shan'));
      expect(onToggle).toHaveBeenCalledWith('shan');
      expect(useFloatingWindowStore.getState().tabs).toHaveLength(0);
    });
  });
});
