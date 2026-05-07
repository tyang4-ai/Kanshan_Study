import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';

const openTabMock = vi.fn();
vi.mock('@/lib/store/floating-window', () => ({
  useFloatingWindowStore: Object.assign(
    (selector: (s: { openTab: typeof openTabMock }) => unknown) =>
      selector({ openTab: openTabMock }),
    { getState: () => ({ openTab: openTabMock }) },
  ),
}));

vi.mock('@/lib/store/provenance', () => ({
  findProvenanceForChit: () => ({ excerpt: '示例片段', fox: '看心', kind: 'reviewed' }),
}));

import { MarginSealPopover } from '@/components/compliance/MarginSealPopover';
import { MARGIN_SEAL_OPEN_EVENT } from '@/components/compliance/MarginSealChit';

const ZERO_RECT: DOMRect = {
  x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0,
  toJSON: () => ({}),
} as DOMRect;

function fire(kind: 'reviewed' | 'flag' | 'sourced', text = 'sample') {
  const detail = { kind, text, rect: ZERO_RECT };
  document.dispatchEvent(new CustomEvent(MARGIN_SEAL_OPEN_EVENT, { detail }));
}

beforeEach(() => {
  openTabMock.mockClear();
});
afterEach(() => cleanup());

describe('MarginSealPopover header labels (D4)', () => {
  it('reviewed kind shows 已软化 without 已审', () => {
    render(<MarginSealPopover />);
    act(() => fire('reviewed'));
    const header = screen.getByTestId('margin-seal-popover');
    expect(header.textContent).toContain('已软化');
    expect(header.textContent).not.toContain('已审');
  });

  it('flag kind shows 待补出处 without 已审', () => {
    render(<MarginSealPopover />);
    act(() => fire('flag'));
    const header = screen.getByTestId('margin-seal-popover');
    expect(header.textContent).toContain('待补出处');
    expect(header.textContent).not.toContain('已审');
  });

  it('sourced kind shows 已附引用 without 已审', () => {
    render(<MarginSealPopover />);
    act(() => fire('sourced'));
    const header = screen.getByTestId('margin-seal-popover');
    expect(header.textContent).toContain('已附引用');
    expect(header.textContent).not.toContain('已审');
  });

  it('renders the footer disclaimer', () => {
    render(<MarginSealPopover />);
    act(() => fire('reviewed'));
    expect(screen.getByText('本工作台不替代专业审稿')).toBeInTheDocument();
  });
});
