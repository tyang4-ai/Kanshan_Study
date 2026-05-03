import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { FoxMeta } from '@/lib/foxes/registry';

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
  FoxRail: () => <div data-testid="fox-rail" />,
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

  it('expands all 9 tails on hover (all opacity:1)', () => {
    const { getByTestId, container } = render(
      <DockInner activeArr={['mo']} onToggleFox={() => {}} />
    );

    const hoverTarget = getByTestId('dock-tails-hover');
    fireEvent.mouseEnter(hoverTarget);

    const tails = container.querySelectorAll('[data-testid="tail"]');
    expect(tails.length).toBe(9);

    tails.forEach((tail) => {
      const wrapper = tail.parentElement!;
      expect(wrapper.style.opacity).toBe('1');
    });
  });
});
