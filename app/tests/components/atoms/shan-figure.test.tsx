import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShanFigure } from '@/components/atoms/ShanFigure';

describe('ShanFigure', () => {
  it('renders body img with correct src + alt', () => {
    render(<ShanFigure />);
    const img = screen.getByAltText('刘看山') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/foxes/body.png');
    expect(img.getAttribute('width')).toBe('120');
  });

  it('applies size prop', () => {
    render(<ShanFigure size={200} />);
    const img = screen.getByAltText('刘看山') as HTMLImageElement;
    expect(img.getAttribute('width')).toBe('200');
  });

  it('without glow prop, no halo div is present', () => {
    const { container } = render(<ShanFigure />);
    expect(container.querySelector('[aria-hidden]')).toBeNull();
  });

  it('with glow=true, halo div is present', () => {
    const { container } = render(<ShanFigure glow />);
    expect(container.querySelector('[aria-hidden]')).not.toBeNull();
  });
});
