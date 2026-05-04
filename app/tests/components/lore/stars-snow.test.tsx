import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Stars } from '@/components/lore/Stars';
import { Snow } from '@/components/lore/Snow';

describe('Stars', () => {
  it('renders count small stars + 12 large stars', () => {
    const { getAllByTestId } = render(<Stars count={80} />);
    const all = getAllByTestId('star');
    expect(all.length).toBe(92);
    const large = all.filter((s) => s.getAttribute('data-star-tier') === 'large');
    expect(large.length).toBe(12);
  });

  it('rng-seeded layout is stable across remounts', () => {
    const { container: a, unmount } = render(<Stars count={80} />);
    const layoutA = Array.from(a.querySelectorAll<HTMLElement>('[data-testid="star"]')).map(
      (el) => `${el.style.left}|${el.style.top}|${el.style.width}`,
    );
    unmount();
    const { container: b } = render(<Stars count={80} />);
    const layoutB = Array.from(b.querySelectorAll<HTMLElement>('[data-testid="star"]')).map(
      (el) => `${el.style.left}|${el.style.top}|${el.style.width}`,
    );
    expect(layoutB).toEqual(layoutA);
  });
});

describe('Snow', () => {
  it('renders 50 flakes by default', () => {
    const { getAllByTestId } = render(<Snow />);
    const flakes = getAllByTestId('snowflake');
    expect(flakes.length).toBe(50);
  });

  it('each flake sets a --drift CSS custom property', () => {
    const { getAllByTestId } = render(<Snow />);
    const flakes = getAllByTestId('snowflake');
    for (const f of flakes) {
      const drift = (f as HTMLElement).style.getPropertyValue('--drift');
      expect(drift).toMatch(/-?\d+(\.\d+)?vw/);
    }
  });

  it('renders three depth tiers', () => {
    const { getAllByTestId } = render(<Snow />);
    const flakes = getAllByTestId('snowflake');
    const tiers = new Set(flakes.map((f) => f.getAttribute('data-flake-tier')));
    expect(tiers).toEqual(new Set(['large', 'mid', 'small']));
  });
});
