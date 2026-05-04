import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { StatsTab } from '@/components/floating/StatsTab';

afterEach(() => cleanup());

describe('StatsTab', () => {
  it('renders overview by default', () => {
    render(<StatsTab />);
    expect(screen.getByTestId('stats-overview')).toBeInTheDocument();
    expect(screen.getByTestId('stats-subtab-overview')).toHaveAttribute('data-active', 'true');
  });

  it('switching to 阅读热度 renders engagement panel', () => {
    render(<StatsTab />);
    fireEvent.click(screen.getByTestId('stats-subtab-engagement'));
    expect(screen.getByTestId('stats-engagement')).toBeInTheDocument();
  });

  it('switching to 读者画像 renders audience panel', () => {
    render(<StatsTab />);
    fireEvent.click(screen.getByTestId('stats-subtab-audience'));
    expect(screen.getByTestId('stats-audience')).toBeInTheDocument();
  });

  it('switching to 收益 renders income panel', () => {
    render(<StatsTab />);
    fireEvent.click(screen.getByTestId('stats-subtab-income'));
    expect(screen.getByTestId('stats-income')).toBeInTheDocument();
  });

  it('rapid double-click on tab is idempotent', () => {
    render(<StatsTab />);
    const btn = screen.getByTestId('stats-subtab-engagement');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('data-active', 'true');
  });
});
