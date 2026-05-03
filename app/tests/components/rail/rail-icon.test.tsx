import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RailIcon } from '@/components/rail/RailIcon';

describe('RailIcon', () => {
  it('renders a search icon with a circle', () => {
    const { container } = render(<RailIcon kind="search" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.querySelector('circle')).not.toBeNull();
  });

  it('renders an add icon with a cross path', () => {
    const { container } = render(<RailIcon kind="add" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    const path = svg!.querySelector('path');
    expect(path).not.toBeNull();
    expect(path!.getAttribute('d')).toBe('M7 2v10M2 7h10');
  });
});
