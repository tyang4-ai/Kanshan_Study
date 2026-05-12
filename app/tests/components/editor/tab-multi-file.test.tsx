import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Tab } from '@/components/editor/Tab';

afterEach(() => cleanup());

describe('Tab', () => {
  it('fires onClick when the body is clicked', () => {
    const onClick = vi.fn();
    render(<Tab filename="x.md" active={false} dirty={false} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('tab'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('fires onClose when × is clicked, and does NOT fire onClick', () => {
    const onClick = vi.fn();
    const onClose = vi.fn();
    render(<Tab filename="x.md" active={false} dirty={false} onClick={onClick} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('tab-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('active=true sets data-active', () => {
    render(<Tab filename="x.md" active={true} dirty={false} />);
    expect(screen.getByTestId('tab').getAttribute('data-active')).toBe('true');
  });

  it('dirty=true colors the dot blue', () => {
    render(<Tab filename="x.md" active={false} dirty={true} />);
    const dot = screen.getByTestId('tab-dirty-dot');
    expect(dot.getAttribute('style')).toMatch(/rgb\(23, 114, 246\)|#1772F6/i);
  });
});
