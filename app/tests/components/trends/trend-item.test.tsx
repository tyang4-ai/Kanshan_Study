import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TrendItem } from '@/components/trends/TrendItem';

afterEach(() => cleanup());

describe('TrendItem', () => {
  const baseProps = {
    rank: 1,
    title: '某热门话题',
    heat: '8.2 万',
    ageLabel: '2 小时',
    tags: ['答主圈', '看墨相关'],
    hot: true,
    vibes: '看势：与你的写作工具论调直接相关',
  };

  it('renders all fields', () => {
    render(<TrendItem {...baseProps} />);
    const item = screen.getByTestId('trend-item');
    expect(item).toHaveTextContent('某热门话题');
    expect(item).toHaveTextContent('8.2 万');
    expect(item).toHaveTextContent('2 小时');
    expect(item).toHaveTextContent('答主圈');
    expect(item).toHaveTextContent('HOT');
    expect(item).toHaveTextContent(/与你的写作工具论调/);
  });

  it('renders without hot badge when hot=false', () => {
    render(<TrendItem {...baseProps} hot={false} />);
    expect(screen.queryByText('HOT')).not.toBeInTheDocument();
  });

  it('renders without vibes when empty', () => {
    render(<TrendItem {...baseProps} vibes="" />);
    expect(screen.queryByText(/看势：/)).not.toBeInTheDocument();
  });

  it('renders empty tags list without crash', () => {
    render(<TrendItem {...baseProps} tags={[]} />);
    expect(screen.getByTestId('trend-item')).toBeInTheDocument();
  });

  it('click fires onClick handler', () => {
    const onClick = vi.fn();
    render(<TrendItem {...baseProps} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('trend-item'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
