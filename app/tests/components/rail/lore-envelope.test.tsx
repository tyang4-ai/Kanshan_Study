import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LoreEnvelope } from '@/components/rail/LoreEnvelope';

describe('LoreEnvelope', () => {
  it('renders a fixed-position button', () => {
    const { container } = render(<LoreEnvelope onClick={() => {}} />);
    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button!.style.position).toBe('fixed');
  });

  it('fires onClick when clicked', () => {
    const onClick = vi.fn();
    const { container } = render(<LoreEnvelope onClick={onClick} />);
    const button = container.querySelector('button')!;
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
