import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

// Mock atoms + child rail components so this test focuses on width-store wiring.
vi.mock('@/components/atoms/CorkBg', () => ({
  CorkBg: ({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) => (
    <div data-testid="corkbg" style={style}>{children}</div>
  ),
}));
vi.mock('@/components/rail/RailContent', () => ({
  RailContent: () => <div data-testid="rail-content" />,
}));
vi.mock('@/components/rail/DockSection', () => ({
  DockSection: () => <div data-testid="dock-section" />,
}));

import { LeftRail } from '@/components/rail/LeftRail';
import { useRailWidthStore } from '@/lib/store/rail-width';

describe('LeftRail', () => {
  beforeEach(() => {
    // Reset store to default 320 between tests.
    useRailWidthStore.setState({ width: 320 });
  });

  it('renders with default width 320', () => {
    const { getByTestId } = render(<LeftRail />);
    const root = getByTestId('left-rail-root');
    expect(root.style.width).toBe('320px');
  });

  it('updates store width on drag', () => {
    const { getByTestId } = render(<LeftRail />);
    const handle = getByTestId('rail-resize-handle');

    fireEvent.mouseDown(handle, { clientX: 0 });
    fireEvent.mouseMove(document, { clientX: 50 });
    fireEvent.mouseUp(document);

    expect(useRailWidthStore.getState().width).toBe(370);
  });

  it('clamps width at 220 (lower bound)', () => {
    const { getByTestId } = render(<LeftRail />);
    const handle = getByTestId('rail-resize-handle');

    fireEvent.mouseDown(handle, { clientX: 0 });
    fireEvent.mouseMove(document, { clientX: -200 });
    fireEvent.mouseUp(document);

    expect(useRailWidthStore.getState().width).toBe(220);
  });

  it('clamps width at 560 (upper bound)', () => {
    const { getByTestId } = render(<LeftRail />);
    const handle = getByTestId('rail-resize-handle');

    fireEvent.mouseDown(handle, { clientX: 0 });
    fireEvent.mouseMove(document, { clientX: 400 });
    fireEvent.mouseUp(document);

    expect(useRailWidthStore.getState().width).toBe(560);
  });
});
