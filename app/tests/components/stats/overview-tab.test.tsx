import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { OverviewTab } from '@/components/stats/OverviewTab';
import overviewSeed from '@/content/seed/stats-overview.json';

interface StatsOverview {
  kpis: { label: string; value: string; delta: string; tone: 'good' | 'warn' | 'neutral' }[];
  spark: number[];
  articles: { title: string; reads: string; likes: number; trend: '↑' | '→' | '↓' }[];
}

afterEach(() => cleanup());

describe('OverviewTab', () => {
  it('renders 4 KPIs from seed', () => {
    render(<OverviewTab />);
    const kpis = screen.getAllByTestId('stats-kpi');
    expect(kpis.length).toBe(4);
    const seed = overviewSeed as StatsOverview;
    seed.kpis.forEach((k) => {
      expect(screen.getByText(k.label)).toBeInTheDocument();
      expect(screen.getByText(k.value)).toBeInTheDocument();
    });
  });

  it('renders the sparkline chart in line mode', () => {
    render(<OverviewTab />);
    const chart = screen.getByTestId('stats-chart');
    expect(chart).toHaveAttribute('data-mode', 'line');
  });

  it('renders 4 article rows from seed', () => {
    render(<OverviewTab />);
    const seed = overviewSeed as StatsOverview;
    expect(seed.articles.length).toBe(4);
    seed.articles.forEach((a) => {
      expect(screen.getByText(a.title)).toBeInTheDocument();
      expect(screen.getByText(a.reads)).toBeInTheDocument();
    });
  });

  it('renders both section titles', () => {
    render(<OverviewTab />);
    expect(screen.getByText('近 30 日阅读趋势')).toBeInTheDocument();
    expect(screen.getByText('本月文章 · 表现排行')).toBeInTheDocument();
  });
});
