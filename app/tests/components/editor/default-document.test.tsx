import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { DefaultDocument } from '@/components/editor/DefaultDocument';

const openTabMock = vi.fn();

vi.mock('@/lib/store/floating-window', () => ({
  useFloatingWindowStore: (selector: (s: { openTab: typeof openTabMock }) => unknown) =>
    selector({ openTab: openTabMock }),
}));

afterEach(() => {
  cleanup();
  openTabMock.mockClear();
});

describe('DefaultDocument', () => {
  it('renders 3 CitationLink elements (web, vault, zhihu)', () => {
    render(<DefaultDocument />);
    const links = screen.getAllByTestId('citation-link');
    expect(links).toHaveLength(3);
  });

  it('renders the locked badge labels [3], [v7], [@冷泉]', () => {
    render(<DefaultDocument />);
    const badges = screen.getAllByTestId('citation-badge');
    expect(badges).toHaveLength(3);
    expect(badges[0]).toHaveAttribute('data-kind', 'web');
    expect(badges[0]).toHaveTextContent('[3]');
    expect(badges[1]).toHaveAttribute('data-kind', 'vault');
    expect(badges[1]).toHaveTextContent('[v7]');
    expect(badges[2]).toHaveAttribute('data-kind', 'zhihu');
    expect(badges[2]).toHaveTextContent('[@冷泉]');
  });

  it('clicking the vault badge opens the vault tab scrolled to article 01-imaging-genomics-turn', () => {
    render(<DefaultDocument />);
    const vaultBadge = screen.getAllByTestId('citation-badge')[1];
    fireEvent.click(vaultBadge);
    expect(openTabMock).toHaveBeenCalledWith('vault', '看典 · 档案库', {
      scrollToArticleId: '01-imaging-genomics-turn',
    });
  });
});
