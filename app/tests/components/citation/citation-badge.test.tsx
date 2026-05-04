import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CitationBadge } from '@/components/citation/CitationBadge';
import type { WebCitation, VaultCitation, ZhihuCitation } from '@/lib/citation/types';

afterEach(() => cleanup());

const web: WebCitation = {
  kind: 'web',
  id: 'w1',
  index: 3,
  url: 'https://example.com',
  title: 'Example',
};
const vault: VaultCitation = {
  kind: 'vault',
  id: 'v1',
  index: 7,
  articleId: 'art-7',
  sourceTitle: '档案 7',
  preview: '预览',
};
const zhihu: ZhihuCitation = {
  kind: 'zhihu',
  id: 'z1',
  handle: 'lengquan',
  displayName: '冷泉',
  answerUrl: 'https://www.zhihu.com/x',
};

describe('CitationBadge', () => {
  it('web renders [3] with data-kind="web"', () => {
    render(<CitationBadge citation={web} />);
    const el = screen.getByTestId('citation-badge');
    expect(el).toHaveAttribute('data-kind', 'web');
    expect(el).toHaveTextContent('[3]');
  });

  it('vault renders [v7] with data-kind="vault"', () => {
    render(<CitationBadge citation={vault} />);
    const el = screen.getByTestId('citation-badge');
    expect(el).toHaveAttribute('data-kind', 'vault');
    expect(el).toHaveTextContent('[v7]');
  });

  it('zhihu renders [@冷泉] with data-kind="zhihu"', () => {
    render(<CitationBadge citation={zhihu} />);
    const el = screen.getByTestId('citation-badge');
    expect(el).toHaveAttribute('data-kind', 'zhihu');
    expect(el).toHaveTextContent('[@冷泉]');
  });

  it('renders as a button (role="button")', () => {
    render(<CitationBadge citation={web} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('fires onClick when clicked', () => {
    const onClick = vi.fn();
    render(<CitationBadge citation={web} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('citation-badge'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('web has blue circle background', () => {
    render(<CitationBadge citation={web} />);
    expect(screen.getByTestId('citation-badge')).toHaveStyle({
      background: 'rgb(23, 114, 246)',
    });
  });

  it('vault has saddle-brown background', () => {
    render(<CitationBadge citation={vault} />);
    expect(screen.getByTestId('citation-badge')).toHaveStyle({
      background: 'rgb(139, 69, 19)',
    });
  });

  it('zhihu has red pill background', () => {
    render(<CitationBadge citation={zhihu} />);
    expect(screen.getByTestId('citation-badge')).toHaveStyle({
      background: 'rgb(192, 48, 40)',
    });
  });
});
