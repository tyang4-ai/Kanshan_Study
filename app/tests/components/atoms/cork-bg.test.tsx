import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CorkBg } from '@/components/atoms/CorkBg';

describe('CorkBg', () => {
  it('renders children', () => {
    render(<CorkBg><span>hello cork</span></CorkBg>);
    expect(screen.getByText('hello cork')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<CorkBg className="my-cork"><span>x</span></CorkBg>);
    expect(container.firstChild).toHaveClass('my-cork');
  });

  it('merges custom style', () => {
    const { container } = render(<CorkBg style={{ height: 500 }}><span>x</span></CorkBg>);
    expect((container.firstChild as HTMLElement).style.height).toBe('500px');
  });

  it('renders the noise filter overlay', () => {
    const { container } = render(<CorkBg><span>x</span></CorkBg>);
    const root = container.firstChild as HTMLElement;
    expect(root.children.length).toBeGreaterThanOrEqual(3);
  });
});
