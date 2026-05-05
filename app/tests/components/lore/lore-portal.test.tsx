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

  it('renders the sign block (北极小镇 + 九狐之家)', () => {
    const { getByTestId } = render(<LorePortal onClose={() => {}} />);
    const sign = getByTestId('lore-sign');
    expect(sign.textContent).toContain('北极小镇');
    expect(sign.textContent).toContain('九狐之家');
    expect(sign.textContent).toContain('NORTH POLE');
  });

  it('renders the close button', () => {
    const { getByTestId } = render(<LorePortal onClose={() => {}} />);
    const close = getByTestId('lore-close');
    expect(close.textContent).toContain('回书桌');
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
});
