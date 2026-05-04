import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Cite } from '@/components/research/Cite';

afterEach(() => cleanup());

describe('Cite', () => {
  it('renders nothing when source is null', () => {
    const { container } = render(<Cite source={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders label and color by kind', () => {
    render(<Cite source={{ kind: 'web', id: 'x', label: '[1]' }} />);
    const sup = screen.getByTestId('research-cite');
    expect(sup).toHaveTextContent('[1]');
    expect(sup).toHaveAttribute('data-kind', 'web');
  });

  it('click fires onClick with source', () => {
    const onClick = vi.fn();
    render(<Cite source={{ kind: 'vault', id: 'v3', label: '[v3]' }} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('research-cite'));
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ kind: 'vault' }));
  });
});
