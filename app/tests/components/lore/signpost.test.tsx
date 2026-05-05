import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Signpost } from '@/components/lore/Signpost';

describe('Signpost', () => {
  it('renders the signpost element', () => {
    const { getByTestId } = render(<Signpost onOpen={() => {}} />);
    expect(getByTestId('lore-signpost')).toBeTruthy();
  });

  it('clicking calls onOpen', () => {
    const onOpen = vi.fn();
    const { getByTestId } = render(<Signpost onOpen={onOpen} />);
    fireEvent.click(getByTestId('lore-signpost'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('hover changes label opacity', () => {
    const { getByTestId } = render(<Signpost onOpen={() => {}} />);
    const label = getByTestId('lore-signpost-label');
    expect(label.style.opacity).toBe('0.5');
    fireEvent.mouseEnter(getByTestId('lore-signpost'));
    expect(label.style.opacity).toBe('1');
    fireEvent.mouseLeave(getByTestId('lore-signpost'));
    expect(label.style.opacity).toBe('0.5');
  });

  it('does not have data-testid="house"', () => {
    const { queryByTestId } = render(<Signpost onOpen={() => {}} />);
    expect(queryByTestId('house')).toBeNull();
  });
});
