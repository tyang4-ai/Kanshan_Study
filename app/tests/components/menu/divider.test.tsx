import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Divider } from '@/components/menu/Divider';

describe('Divider', () => {
  it('renders default 10% black background', () => {
    const { container } = render(<Divider />);
    const el = container.firstChild as HTMLElement;
    // jsdom normalizes rgba(0,0,0,0.10) → rgba(0, 0, 0, 0.1)
    expect(el.style.background).toMatch(/rgba\(0,\s*0,\s*0,\s*0?\.10?\)/);
    expect(el.style.height).toBe('1px');
    expect(el.style.margin).toBe('4px 8px');
  });

  it('renders dim variant with 6% black background', () => {
    const { container } = render(<Divider dim />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.background).toMatch(/rgba\(0,\s*0,\s*0,\s*0?\.06\)/);
  });
});
