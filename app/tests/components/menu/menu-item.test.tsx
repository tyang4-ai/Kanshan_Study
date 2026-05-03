import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { MenuItem } from '@/components/menu/MenuItem';

describe('MenuItem', () => {
  it('renders label and shortcut', () => {
    render(<MenuItem label="复制" shortcut="⌘C" onClick={() => {}} />);
    expect(screen.getByText('复制')).toBeInTheDocument();
    expect(screen.getByText('⌘C')).toBeInTheDocument();
  });

  it('calls onClick when enabled and clicked', () => {
    const onClick = vi.fn();
    render(<MenuItem label="复制" onClick={onClick} />);
    fireEvent.click(screen.getByRole('menuitem'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<MenuItem label="剪切" onClick={onClick} disabled />);
    const item = screen.getByRole('menuitem');
    expect(item.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(item);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders submenu and chevron, hides shortcut, suppresses onClick', () => {
    const onClick = vi.fn();
    render(
      <MenuItem
        label="召集读者团"
        shortcut="⌘⇧R"
        onClick={onClick}
        submenu={<div data-testid="submenu" />}
      />,
    );
    expect(screen.getByTestId('submenu')).toBeInTheDocument();
    expect(screen.getByText('▸')).toBeInTheDocument();
    expect(screen.queryByText('⌘⇧R')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('hover toggles background style', () => {
    render(<MenuItem label="粘贴" onClick={() => {}} />);
    const item = screen.getByRole('menuitem') as HTMLElement;
    expect(item.style.background).toBe('transparent');
    fireEvent.mouseEnter(item);
    // default (no accent) → blue
    expect(item.style.background).toBe('rgb(23, 114, 246)');
    fireEvent.mouseLeave(item);
    expect(item.style.background).toBe('transparent');
  });

  it('hover applies accentColor gradient when provided', () => {
    render(<MenuItem label="让看墨润色" onClick={() => {}} accentColor="#3A4252" />);
    const item = screen.getByRole('menuitem') as HTMLElement;
    fireEvent.mouseEnter(item);
    // jsdom converts hex → rgb; #3A4252 → rgb(58, 66, 82)
    expect(item.style.background).toMatch(/#3A4252|rgba?\(58,\s*66,\s*82/i);
    expect(item.style.borderLeft).toMatch(/#3A4252|rgb\(58,\s*66,\s*82\)/i);
  });

  it('renders left-slot icon when supplied', () => {
    render(
      <MenuItem
        label="让看墨润色"
        onClick={() => {}}
        icon={<span data-testid="fox-dot">墨</span>}
      />,
    );
    expect(screen.getByTestId('fox-dot')).toBeInTheDocument();
  });

  it('stops propagation on click', () => {
    const parentClick = vi.fn();
    const onClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <MenuItem label="复制" onClick={onClick} />
      </div>,
    );
    fireEvent.click(screen.getByRole('menuitem'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(parentClick).not.toHaveBeenCalled();
  });
});
