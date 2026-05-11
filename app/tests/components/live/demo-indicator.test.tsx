import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DemoIndicator } from '@/components/live/DemoIndicator';

// useRouter requires an App Router mount in real Next, which the test harness
// doesn't provide. Mock it so the component can render.
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

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

  it('exposes a 退出 button that pushes back to /', () => {
    pushMock.mockClear();
    const { getByTestId } = render(<DemoIndicator />);
    const btn = getByTestId('demo-exit');
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('aria-label')).toContain('退出');
    fireEvent.click(btn);
    expect(pushMock).toHaveBeenCalledWith('/');
  });
});
