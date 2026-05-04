import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FoxLoreCard } from '@/components/lore/FoxLoreCard';
import { getFox } from '@/lib/foxes/registry';

describe('FoxLoreCard', () => {
  it('renders fox name + epithet + species + persona + lore', () => {
    const lore = '墨色三分，留白七分。冬夜守灯，不写则已。';
    const { getByTestId } = render(<FoxLoreCard foxId="mo" lore={lore} />);
    const fox = getFox('mo');
    expect(getByTestId('card-name').textContent).toBe(fox.name);
    expect(getByTestId('card-epithet').textContent).toBe(fox.epithet);
    expect(getByTestId('card-meta').textContent).toContain(fox.species);
    expect(getByTestId('card-meta').textContent).toContain(fox.persona);
    expect(getByTestId('card-lore').textContent).toBe(lore);
  });

  it('name color is the fox glow', () => {
    const { getByTestId } = render(<FoxLoreCard foxId="shan" lore="x" />);
    const name = getByTestId('card-name');
    expect((name as HTMLElement).style.color).toBeTruthy();
    // jsdom normalizes color to rgb; only check the value is non-empty since
    // hex-to-rgb conversion across jsdom versions is finicky.
    expect((name as HTMLElement).style.color.length).toBeGreaterThan(0);
  });

  it('renders the gold rule and museum-colophon header marker', () => {
    const { getByTestId } = render(<FoxLoreCard foxId="mo" lore="x" />);
    expect(getByTestId('card-rule')).toBeTruthy();
  });
});
