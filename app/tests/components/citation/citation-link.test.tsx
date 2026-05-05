import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { CitationLink } from '@/components/citation/CitationLink';
import type { WebCitation, VaultCitation, ZhihuCitation } from '@/lib/citation/types';

const mockOpenTab = vi.fn();

vi.mock('@/lib/store/floating-window', () => ({
  useFloatingWindowStore: (selector: (s: { openTab: typeof mockOpenTab }) => unknown) =>
    selector({ openTab: mockOpenTab }),
}));

const web: WebCitation = {
  kind: 'web',
  id: 'w1',
  index: 3,
  url: 'https://example.com/article',
  title: 'A long descriptive title',
};
const vault: VaultCitation = {
  kind: 'vault',
  id: 'v1',
  index: 7,
  articleId: 'art-42',
  sourceTitle: '论文 42',
  preview: '这是一段档案预览文字。',
};
const zhihuWithBio: ZhihuCitation = {
  kind: 'zhihu',
  id: 'z1',
  handle: 'lengquan',
  displayName: '冷泉',
  answerUrl: 'https://www.zhihu.com/q/1/a/2',
  bio: '科普答主，研究方向材料学。',
};

describe('CitationLink', () => {
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockOpenTab.mockReset();
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    vi.useRealTimers();
    openSpy.mockRestore();
    cleanup();
  });

  it('vault: hover + 150ms → card shows 书房 · sourceTitle and preview', () => {
    render(<CitationLink citation={vault} />);
    expect(screen.queryByTestId('citation-hover-card')).toBeNull();
    fireEvent.mouseEnter(screen.getByTestId('citation-link'));
    act(() => {
      vi.advanceTimersByTime(150);
    });
    const card = screen.getByTestId('citation-hover-card');
    expect(card).toHaveTextContent('书房 · 论文 42');
    expect(card).toHaveTextContent('这是一段档案预览文字。');
  });

  it('web: hover + 150ms → card shows 外链 heading and title', () => {
    render(<CitationLink citation={web} />);
    fireEvent.mouseEnter(screen.getByTestId('citation-link'));
    act(() => {
      vi.advanceTimersByTime(150);
    });
    const card = screen.getByTestId('citation-hover-card');
    expect(card).toHaveTextContent('外链');
    expect(card).toHaveTextContent('A long descriptive title');
  });

  it('zhihu: hover → @displayName + bio + footer text', () => {
    render(<CitationLink citation={zhihuWithBio} />);
    fireEvent.mouseEnter(screen.getByTestId('citation-link'));
    act(() => {
      vi.advanceTimersByTime(150);
    });
    const card = screen.getByTestId('citation-hover-card');
    expect(card).toHaveTextContent('@冷泉');
    expect(card).toHaveTextContent('科普答主，研究方向材料学。');
    expect(card).toHaveTextContent('点击查看其知乎回答原文');
  });

  it('mouseLeave → card closes', () => {
    render(<CitationLink citation={vault} />);
    const wrap = screen.getByTestId('citation-link');
    fireEvent.mouseEnter(wrap);
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.getByTestId('citation-hover-card')).toBeInTheDocument();
    fireEvent.mouseLeave(wrap);
    expect(screen.queryByTestId('citation-hover-card')).toBeNull();
  });

  it('click vault badge → openTab called with (vault, 看典 · 档案库, { scrollToArticleId })', () => {
    render(<CitationLink citation={vault} />);
    fireEvent.click(screen.getByTestId('citation-badge'));
    expect(mockOpenTab).toHaveBeenCalledWith('vault', '看典 · 档案库', {
      scrollToArticleId: 'art-42',
    });
  });

  it('click web badge → window.open called with the URL', () => {
    render(<CitationLink citation={web} />);
    fireEvent.click(screen.getByTestId('citation-badge'));
    expect(openSpy).toHaveBeenCalledWith(web.url, '_blank', 'noopener,noreferrer');
  });

  it('Esc keypress while open → closes card', () => {
    render(<CitationLink citation={vault} />);
    fireEvent.mouseEnter(screen.getByTestId('citation-link'));
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.getByTestId('citation-hover-card')).toBeInTheDocument();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(screen.queryByTestId('citation-hover-card')).toBeNull();
  });

  it('demo:true web citation: click → alert called, no window.open', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const demoWeb: WebCitation = {
      kind: 'web',
      id: 'w-demo',
      index: 9,
      url: 'https://arxiv.org/abs/2024.99999',
      title: 'Placeholder demo',
      demo: true,
    };
    render(<CitationLink citation={demoWeb} />);
    fireEvent.click(screen.getByTestId('citation-badge'));
    expect(alertSpy).toHaveBeenCalledWith('[示例数据] 这是演示链接，未做实际跳转');
    expect(openSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('demo:false (or undefined) web citation: click → window.open as usual', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    render(<CitationLink citation={{ ...web, demo: false }} />);
    fireEvent.click(screen.getByTestId('citation-badge'));
    expect(openSpy).toHaveBeenCalledWith(web.url, '_blank', 'noopener,noreferrer');
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('rapid mouseEnter+mouseLeave before 150ms → card never opens', () => {
    render(<CitationLink citation={vault} />);
    const wrap = screen.getByTestId('citation-link');
    fireEvent.mouseEnter(wrap);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    fireEvent.mouseLeave(wrap);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByTestId('citation-hover-card')).toBeNull();
  });
});
