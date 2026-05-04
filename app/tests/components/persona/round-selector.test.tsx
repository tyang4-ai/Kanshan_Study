import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { RoundSelector } from '@/components/persona/RoundSelector';

afterEach(() => cleanup());

describe('RoundSelector', () => {
  it('renders 1/2/3 buttons', () => {
    render(<RoundSelector value={1} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
  });

  it('aria-pressed reflects active value', () => {
    render(<RoundSelector value={2} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('clicking 2 calls onChange(2)', () => {
    const onChange = vi.fn();
    render(<RoundSelector value={1} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('disabled=true → all buttons disabled and titled "多人格才能互评"', () => {
    render(<RoundSelector value={1} onChange={vi.fn()} disabled />);
    for (const label of ['1', '2', '3']) {
      const btn = screen.getByRole('button', { name: label });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', '多人格才能互评');
    }
  });

  it('disabled=true → click does NOT call onChange', () => {
    const onChange = vi.fn();
    render(<RoundSelector value={1} onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
