import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FoxWalker } from '@/components/lore/FoxWalker';

describe('FoxWalker', () => {
  it('renders an svg sized to size * 1.7 / size', () => {
    const { container } = render(
      <FoxWalker y="80%" size={26} delay="0s" dur="28s" tone="graphite" />,
    );
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe(`${26 * 1.7}`);
    expect(svg!.getAttribute('height')).toBe('26');
  });

  it('applies graphite vs silver tone fills', () => {
    const { container: a } = render(
      <FoxWalker y="80%" size={26} delay="0s" dur="28s" tone="graphite" />,
    );
    const { container: b } = render(
      <FoxWalker y="80%" size={26} delay="0s" dur="28s" tone="silver" />,
    );
    const fillA = a.querySelector('g')?.getAttribute('fill');
    const fillB = b.querySelector('g')?.getAttribute('fill');
    expect(fillA).not.toBe(fillB);
  });
});
