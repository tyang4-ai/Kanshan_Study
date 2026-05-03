import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { Submenu } from '@/components/menu/Submenu';

describe('Submenu', () => {
  it('renders all item labels', () => {
    render(
      <Submenu
        items={[
          { label: '默认四人格 · 自动配置', onClick: () => {} },
          { label: '自选人格…', onClick: () => {} },
          { label: '近期常用：业内行家 + 路人读者', onClick: () => {} },
        ]}
      />,
    );
    expect(screen.getByText('默认四人格 · 自动配置')).toBeInTheDocument();
    expect(screen.getByText('自选人格…')).toBeInTheDocument();
    expect(screen.getByText('近期常用：业内行家 + 路人读者')).toBeInTheDocument();
  });

  it('calls each item onClick exactly once when clicked', () => {
    const a = vi.fn();
    const b = vi.fn();
    const c = vi.fn();
    render(
      <Submenu
        items={[
          { label: '默认四人格 · 自动配置', onClick: a },
          { label: '自选人格…', onClick: b },
          { label: '近期常用：业内行家 + 路人读者', onClick: c },
        ]}
      />,
    );
    fireEvent.click(screen.getByText('默认四人格 · 自动配置'));
    fireEvent.click(screen.getByText('自选人格…'));
    fireEvent.click(screen.getByText('近期常用：业内行家 + 路人读者'));
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(c).toHaveBeenCalledTimes(1);
  });

  it('stops click propagation to parent', () => {
    const parentClick = vi.fn();
    const itemClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <Submenu items={[{ label: '自选人格…', onClick: itemClick }]} />
      </div>,
    );
    fireEvent.click(screen.getByText('自选人格…'));
    expect(itemClick).toHaveBeenCalledTimes(1);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('hover toggles row highlight to blue', () => {
    render(<Submenu items={[{ label: '自选人格…', onClick: () => {} }]} />);
    const row = screen.getByText('自选人格…') as HTMLElement;
    expect(row.style.background).toBe('transparent');
    fireEvent.mouseEnter(row);
    expect(row.style.background).toBe('rgb(23, 114, 246)');
    fireEvent.mouseLeave(row);
    expect(row.style.background).toBe('transparent');
  });
});
