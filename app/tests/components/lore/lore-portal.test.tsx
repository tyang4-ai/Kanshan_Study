import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { LorePortal } from '@/components/lore/LorePortal';
import { getFox } from '@/lib/foxes/registry';

describe('LorePortal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders 9 houses', () => {
    const { getAllByTestId } = render(<LorePortal onClose={() => {}} />);
    const houses = getAllByTestId('house');
    expect(houses.length).toBe(9);
  });

  it('renders the sign block (北极小镇 + 题眼 subtitle)', () => {
    const { getByTestId } = render(<LorePortal onClose={() => {}} />);
    const sign = getByTestId('lore-sign');
    expect(sign.textContent).toContain('北极小镇');
    expect(sign.textContent).toContain('九尾各执其能');
    expect(sign.textContent).toContain('看山唯予所欲');
    expect(sign.textContent).toContain('NORTH POLE');
  });

  it('北极小镇 title is the dialog\'s aria-labelledby anchor (h1)', () => {
    const { container } = render(<LorePortal onClose={() => {}} />);
    const portal = container.querySelector('[role="dialog"]');
    expect(portal).not.toBeNull();
    expect(portal!.getAttribute('aria-modal')).toBe('true');
    expect(portal!.getAttribute('aria-labelledby')).toBe('lore-title');
    const h1 = container.querySelector('#lore-title');
    expect(h1?.tagName).toBe('H1');
    expect(h1?.textContent).toBe('北极小镇');
  });

  it('renders the close button', () => {
    const { getByTestId } = render(<LorePortal onClose={() => {}} />);
    const close = getByTestId('lore-close');
    expect(close.textContent).toContain('返回工作台');
    expect(close.getAttribute('aria-label')).toBe('返回工作台');
  });

  it('clicking close calls onClose after 380ms', () => {
    const onClose = vi.fn();
    const { getByTestId } = render(<LorePortal onClose={onClose} />);
    fireEvent.click(getByTestId('lore-close'));
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(380);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('IP footer reads from registry attribution', () => {
    const { getByTestId } = render(<LorePortal onClose={() => {}} />);
    const footer = getByTestId('lore-ip-footer');
    expect(footer.textContent).toContain(getFox('shan').attribution);
    expect(footer.textContent).toContain('其余八狐为原创设定');
  });

  it('hover house → toast appears on click; click again replaces, never stacks', () => {
    const { getAllByTestId, getByTestId } = render(<LorePortal onClose={() => {}} />);
    const houses = getAllByTestId('house');
    fireEvent.click(houses[0]);
    const toast = getByTestId('lore-toast');
    expect(toast.getAttribute('data-toast-active')).toBe('true');
    expect(toast.textContent).toContain('遇见');

    // Click another house — toast should still be there but with different content
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.click(houses[1]);
    expect(getByTestId('lore-toast').getAttribute('data-toast-active')).toBe('true');

    // After 2.4s total, toast clears
    act(() => {
      vi.advanceTimersByTime(2400);
    });
    expect(getByTestId('lore-toast').getAttribute('data-toast-active')).toBe('false');
  });

  it('hint dismisses after first hover', () => {
    const { getAllByTestId, getByTestId } = render(<LorePortal onClose={() => {}} />);
    const hint = getByTestId('lore-hint');
    expect(hint.style.opacity).toBe('0.4');
    const houses = getAllByTestId('house');
    fireEvent.mouseEnter(houses[0]);
    expect(getByTestId('lore-hint').style.opacity).toBe('0');
  });

  it('still renders exactly 9 houses (signpost is not a house)', () => {
    const { getAllByTestId } = render(<LorePortal onClose={() => {}} />);
    expect(getAllByTestId('house').length).toBe(9);
  });

  it('renders the signpost at the end of the village row', () => {
    const { getByTestId } = render(<LorePortal onClose={() => {}} />);
    expect(getByTestId('lore-signpost')).toBeTruthy();
  });

  it('clicking signpost reveals the tech details panel', () => {
    const { getByTestId, queryByTestId } = render(<LorePortal onClose={() => {}} />);
    expect(queryByTestId('tech-details-panel')).toBeNull();
    fireEvent.click(getByTestId('lore-signpost'));
    expect(getByTestId('tech-details-panel')).toBeTruthy();
  });

  it('Escape key closes the portal (calls onClose after 380ms)', () => {
    const onClose = vi.fn();
    render(<LorePortal onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(380);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking a house pins it (aria-pressed=true); clicking again unpins', () => {
    const { getAllByTestId } = render(<LorePortal onClose={() => {}} />);
    const houses = getAllByTestId('house');
    fireEvent.click(houses[0]);
    expect(houses[0].getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(houses[0]);
    expect(houses[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('Escape unpins a pinned fox before closing the portal (two-step Esc)', () => {
    const onClose = vi.fn();
    const { getAllByTestId } = render(<LorePortal onClose={onClose} />);
    const houses = getAllByTestId('house');
    fireEvent.click(houses[0]);
    expect(houses[0].getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(houses[0].getAttribute('aria-pressed')).toBe('false');
    act(() => {
      vi.advanceTimersByTime(380);
    });
    expect(onClose).not.toHaveBeenCalled(); // first Esc only unpinned
    fireEvent.keyDown(window, { key: 'Escape' });
    act(() => {
      vi.advanceTimersByTime(380);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('IP footer is legible at projector scale (fontSize ≥ 11px, opacity ≥ 0.7)', () => {
    const { getByTestId } = render(<LorePortal onClose={() => {}} />);
    const footer = getByTestId('lore-ip-footer') as HTMLElement;
    expect(parseInt(footer.style.fontSize, 10)).toBeGreaterThanOrEqual(11);
    // Color encodes opacity in rgba; just verify the rgba(...,0.7) tail is present.
    expect(footer.style.color).toMatch(/0\.7\)?$/);
  });
});
