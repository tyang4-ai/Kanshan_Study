import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { KPI } from '@/components/stats/KPI';

afterEach(() => cleanup());

describe('KPI', () => {
  it('renders label, value, and delta', () => {
    render(<KPI label="阅读" value="184.2k" delta="+12.4%" tone="good" />);
    expect(screen.getByText('阅读')).toBeInTheDocument();
    expect(screen.getByText('184.2k')).toBeInTheDocument();
    expect(screen.getByText('+12.4%')).toBeInTheDocument();
  });

  it('tone good → green delta color', () => {
    render(<KPI label="点赞" value="9,471" delta="+8.1%" tone="good" />);
    const delta = screen.getByText('+8.1%');
    expect((delta as HTMLElement).style.color).toBe('rgb(31, 139, 102)');
  });

  it('tone warn → red delta color', () => {
    render(<KPI label="评论" value="612" delta="-3.2%" tone="warn" />);
    const delta = screen.getByText('-3.2%');
    expect((delta as HTMLElement).style.color).toBe('rgb(192, 48, 40)');
  });

  it('tone neutral → grey delta color', () => {
    render(<KPI label="X" value="0" delta="0%" tone="neutral" />);
    const delta = screen.getByText('0%');
    expect((delta as HTMLElement).style.color).toBe('rgb(122, 139, 159)');
  });
});
