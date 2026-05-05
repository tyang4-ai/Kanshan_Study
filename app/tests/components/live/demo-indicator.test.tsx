import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DemoIndicator } from '@/components/live/DemoIndicator';

describe('DemoIndicator', () => {
  it('renders the LIVE DEMO pill', () => {
    const { getByTestId } = render(<DemoIndicator />);
    const el = getByTestId('demo-indicator');
    expect(el.textContent).toContain('LIVE DEMO');
    expect(el.textContent).toContain('缓存模式');
  });

  it('is fixed-positioned bottom-right', () => {
    const { getByTestId } = render(<DemoIndicator />);
    const el = getByTestId('demo-indicator');
    expect(el.style.position).toBe('fixed');
    expect(el.style.bottom).toBeTruthy();
    expect(el.style.right).toBeTruthy();
  });
});
