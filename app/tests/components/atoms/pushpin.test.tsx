import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Pushpin } from '@/components/atoms/Pushpin';

describe('Pushpin', () => {
  it('default size + color', () => {
    const { container } = render(<Pushpin />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('14');
    expect(svg?.getAttribute('height')).toBe('14');
    const dome = container.querySelector('ellipse[cx="7"][cy="8"]');
    expect(dome?.getAttribute('fill')).toBe('#1772F6');
  });

  it('custom size + color', () => {
    const { container } = render(<Pushpin color="#FF0000" size={20} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('20');
    expect(svg?.getAttribute('height')).toBe('20');
    const dome = container.querySelector('ellipse[cx="7"][cy="8"]');
    expect(dome?.getAttribute('fill')).toBe('#FF0000');
  });
});
