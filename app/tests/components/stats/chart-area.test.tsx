import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ChartArea } from '@/components/stats/ChartArea';

afterEach(() => cleanup());

describe('ChartArea', () => {
  it('line mode renders a polyline', () => {
    const { container } = render(<ChartArea data={[10, 20, 30, 40, 50]} />);
    const chart = screen.getByTestId('stats-chart');
    expect(chart).toHaveAttribute('data-mode', 'line');
    const polyline = container.querySelector('polyline');
    expect(polyline).not.toBeNull();
    expect(polyline?.getAttribute('points')).toBeTruthy();
  });

  it('line mode renders a final-point circle marker', () => {
    const { container } = render(<ChartArea data={[10, 20, 30]} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(1);
  });

  it('bar mode renders one rect per data point', () => {
    const { container } = render(<ChartArea data={[5, 10, 15, 20]} barMode />);
    const chart = screen.getByTestId('stats-chart');
    expect(chart).toHaveAttribute('data-mode', 'bar');
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(4);
  });

  it('empty array does not produce NaN coordinates (line mode)', () => {
    const { container } = render(<ChartArea data={[]} />);
    const polyline = container.querySelector('polyline');
    const polygon = container.querySelector('polygon');
    expect(polyline?.getAttribute('points') ?? '').not.toContain('NaN');
    expect(polygon?.getAttribute('points') ?? '').not.toContain('NaN');
  });

  it('all-zero array does not divide by zero', () => {
    const { container } = render(<ChartArea data={[0, 0, 0, 0]} />);
    const polyline = container.querySelector('polyline');
    expect(polyline?.getAttribute('points') ?? '').not.toContain('NaN');
    expect(polyline?.getAttribute('points') ?? '').not.toContain('Infinity');
  });

  it('empty array bar mode does not throw', () => {
    const { container } = render(<ChartArea data={[]} barMode />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(0);
  });
});
