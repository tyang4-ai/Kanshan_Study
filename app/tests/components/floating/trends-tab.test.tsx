import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TrendsTab } from '@/components/floating/TrendsTab';

const openTabMock = vi.fn();
vi.mock('@/lib/store/floating-window', () => ({
  useFloatingWindowStore: Object.assign(
    (selector: (s: { openTab: typeof openTabMock }) => unknown) =>
      selector({ openTab: openTabMock }),
    { getState: () => ({ openTab: openTabMock }) },
  ),
}));

beforeEach(() => {
  openTabMock.mockClear();
});
afterEach(() => cleanup());

describe('TrendsTab', () => {
  it('renders 与你有关 tab by default with items', () => {
    render(<TrendsTab />);
    const items = screen.getAllByTestId('trend-item');
    expect(items.length).toBeGreaterThanOrEqual(5);
    // Active tab indicator
    expect(screen.getByTestId('trends-tab-relevant')).toHaveAttribute('data-active', 'true');
  });

  it('switching to 全榜 changes the list', () => {
    render(<TrendsTab />);
    const allTab = screen.getByTestId('trends-tab-all');
    fireEvent.click(allTab);
    expect(allTab).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('trends-tab-relevant')).toHaveAttribute('data-active', 'false');
  });

  it('clicking a trend item opens ResearchTab with the title as selection', () => {
    render(<TrendsTab />);
    const firstItem = screen.getAllByTestId('trend-item')[0];
    fireEvent.click(firstItem);
    expect(openTabMock).toHaveBeenCalledTimes(1);
    expect(openTabMock).toHaveBeenCalledWith(
      'research',
      '看水 · 考据卷',
      expect.objectContaining({
        selection: expect.objectContaining({ text: expect.any(String) }),
      }),
    );
  });

  it('renders quota header text', () => {
    render(<TrendsTab />);
    expect(screen.getByText(/100\/天 已用/)).toBeInTheDocument();
  });
});
