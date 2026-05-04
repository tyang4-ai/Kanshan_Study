import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SourceRow } from '@/components/research/SourceRow';

afterEach(() => cleanup());

describe('SourceRow', () => {
  const src = { kind: 'web' as const, id: 'r-w-1', label: '[1]', text: 'Aerts 2014', host: 'nature.com' };
  it('renders label, text, host', () => {
    render(<SourceRow source={src} />);
    const row = screen.getByTestId('research-source-row');
    expect(row).toHaveTextContent('[1]');
    expect(row).toHaveTextContent('Aerts 2014');
    expect(row).toHaveTextContent('nature.com');
  });

  it('click fires onClick when provided', () => {
    const onClick = vi.fn();
    render(<SourceRow source={src} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('research-source-row'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
