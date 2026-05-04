import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ResearchTab } from '@/components/floating/ResearchTab';
import { useEditorStore } from '@/lib/store/editor';

const insertContentMock = vi.fn((html: string) => {
  void html;
  return { run: () => true };
});
const chainMock = { focus: () => chainMock, insertContent: insertContentMock };
const fakeEditor = { chain: () => chainMock } as unknown as Parameters<typeof useEditorStore.setState>[0];

beforeEach(() => {
  useEditorStore.setState({ editor: null });
  insertContentMock.mockClear();
});
afterEach(() => cleanup());

describe('ResearchTab', () => {
  it('renders title, query, outline chips', () => {
    render(<ResearchTab />);
    expect(screen.getAllByText(/影像组学外部验证/).length).toBeGreaterThan(0);
    // 5 outline chips
    const chips = screen.getAllByTestId('research-outline-chip');
    expect(chips.length).toBe(5);
  });

  it('renders all sections', () => {
    render(<ResearchTab />);
    const headings = screen.getAllByTestId('research-section-heading');
    expect(headings.length).toBe(5);
  });

  it('replaces query with provided selection', () => {
    render(<ResearchTab selection={{ text: 'TCIA 数据集' }} />);
    expect(screen.getByTestId('research-query')).toHaveTextContent('TCIA 数据集');
  });

  it('scope selector switches active scope', () => {
    render(<ResearchTab />);
    const quick = screen.getByTestId('research-scope-quick');
    fireEvent.click(quick);
    expect(quick).toHaveAttribute('data-active', 'true');
  });

  it('插入正文 calls editor insertContent', () => {
    useEditorStore.setState({ editor: fakeEditor as never });
    render(<ResearchTab />);
    fireEvent.click(screen.getByTestId('research-insert'));
    expect(insertContentMock).toHaveBeenCalledTimes(1);
    expect(insertContentMock.mock.calls[0][0]).toEqual(expect.any(String));
  });

  it('插入正文 with no editor mounted is a no-op (does not throw)', () => {
    render(<ResearchTab />);
    expect(() => fireEvent.click(screen.getByTestId('research-insert'))).not.toThrow();
    expect(insertContentMock).not.toHaveBeenCalled();
  });

  it('renders sources rail with all sources', () => {
    render(<ResearchTab />);
    const rows = screen.getAllByTestId('research-source-row');
    expect(rows.length).toBeGreaterThanOrEqual(5);
  });
});
