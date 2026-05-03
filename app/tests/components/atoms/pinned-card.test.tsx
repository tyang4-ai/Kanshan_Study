import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PinnedCard } from '@/components/atoms/PinnedCard';

describe('PinnedCard', () => {
  it('renders children', () => {
    render(<PinnedCard>card content</PinnedCard>);
    expect(screen.getByText('card content')).toBeInTheDocument();
  });

  it('applies rotate', () => {
    const { container } = render(<PinnedCard rotate={-3}>x</PinnedCard>);
    const outer = container.firstChild as HTMLElement;
    expect(outer.style.transform).toContain('rotate(-3deg)');
  });

  it('applies pinColor to the pushpin', () => {
    const { container } = render(<PinnedCard pinColor="#00FF00">x</PinnedCard>);
    const dome = container.querySelector('ellipse[cx="7"][cy="8"]');
    expect(dome?.getAttribute('fill')).toBe('#00FF00');
  });

  it('default pinColor is brand red', () => {
    const { container } = render(<PinnedCard>x</PinnedCard>);
    const dome = container.querySelector('ellipse[cx="7"][cy="8"]');
    expect(dome?.getAttribute('fill')).toBe('#C03028');
  });
});
