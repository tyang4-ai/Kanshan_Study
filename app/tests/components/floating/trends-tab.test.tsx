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
  window.localStorage.clear();
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

  it('clicking a trend without acknowledgement opens the modal and does NOT open research', () => {
    render(<TrendsTab />);
    const firstItem = screen.getAllByTestId('trend-item')[0];
    fireEvent.click(firstItem);
    expect(openTabMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('trends-confirm-modal')).toBeInTheDocument();
  });

  it('confirming the modal sets localStorage and opens research with the title', () => {
    render(<TrendsTab />);
    const firstItem = screen.getAllByTestId('trend-item')[0];
    fireEvent.click(firstItem);
    fireEvent.click(screen.getByTestId('trends-confirm-checkbox'));
    fireEvent.click(screen.getByTestId('trends-confirm-confirm'));

    expect(window.localStorage.getItem('kanshan-trends-acknowledged')).toBeTruthy();
    expect(openTabMock).toHaveBeenCalledTimes(1);
    expect(openTabMock).toHaveBeenCalledWith(
      'research',
      '看水 · 考据卷',
      expect.objectContaining({
        selection: expect.objectContaining({ text: expect.any(String) }),
      }),
    );
  });

  it('clicking trend after acknowledgement opens research immediately, no modal', () => {
    window.localStorage.setItem('kanshan-trends-acknowledged', new Date().toISOString());
    render(<TrendsTab />);
    const firstItem = screen.getAllByTestId('trend-item')[0];
    fireEvent.click(firstItem);
    expect(openTabMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('trends-confirm-modal')).not.toBeInTheDocument();
  });

  it('cancel in modal closes it without opening research', () => {
    render(<TrendsTab />);
    fireEvent.click(screen.getAllByTestId('trend-item')[0]);
    fireEvent.click(screen.getByTestId('trends-confirm-cancel'));
    expect(openTabMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('trends-confirm-modal')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('kanshan-trends-acknowledged')).toBeNull();
  });

  it('renders quota header text', () => {
    render(<TrendsTab />);
    expect(screen.getByText(/100\/天 已用/)).toBeInTheDocument();
  });

  // 2026-05-11: 知乎故事 section surfaces the official hackathon_story/list
  // endpoint (HMAC live-verified). Mock-mode returns the fixture array, so the
  // section should render on initial paint.
  describe('知乎故事 section (Li8-PitchProd)', () => {
    it('renders the stories section header with count', async () => {
      render(<TrendsTab />);
      // Wait one tick for getStoryList's then() to flush.
      await new Promise((r) => setTimeout(r, 0));
      const section = await screen.findByTestId('trends-stories-section');
      expect(section).toBeInTheDocument();
      expect(section.textContent).toMatch(/知乎故事/);
      expect(section.textContent).toMatch(/官方脑洞库/);
    });

    it('collapsed by default; toggle expands story items', async () => {
      render(<TrendsTab />);
      await new Promise((r) => setTimeout(r, 0));
      const toggle = await screen.findByTestId('trends-stories-toggle');
      // Items hidden initially
      expect(screen.queryAllByTestId('trends-story-item').length).toBe(0);
      fireEvent.click(toggle);
      expect(screen.getAllByTestId('trends-story-item').length).toBeGreaterThan(0);
    });

    it('clicking story 钉 pins the story into the corkboard', async () => {
      const { useCorkboardStore } = await import('@/lib/store/corkboard');
      const before = useCorkboardStore.getState().pins.length;
      render(<TrendsTab />);
      await new Promise((r) => setTimeout(r, 0));
      fireEvent.click(await screen.findByTestId('trends-stories-toggle'));
      fireEvent.click(screen.getAllByTestId('trends-story-pin')[0]);
      const after = useCorkboardStore.getState().pins.length;
      expect(after).toBe(before + 1);
      const newest = useCorkboardStore.getState().pins[after - 1];
      expect(newest.content.title).toMatch(/知乎故事/);
    });
  });
});
