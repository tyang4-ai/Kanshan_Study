import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tab } from '@/components/editor/Tab';

describe('Tab', () => {
  it('shows blue dirty dot when dirty=true', () => {
    render(<Tab filename="foo.md" active={false} dirty={true} />);
    const dot = screen.getByTestId('tab-dirty-dot');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveStyle({ background: '#1772F6' });
  });

  it('shows transparent dot when dirty=false', () => {
    render(<Tab filename="foo.md" active={false} dirty={false} />);
    const dot = screen.getByTestId('tab-dirty-dot');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveStyle({ background: 'transparent' });
  });

  it('marks active tab with data-active=true and editor background', () => {
    render(<Tab filename="active.md" active={true} dirty={false} />);
    const tab = screen.getByTestId('tab');
    expect(tab.getAttribute('data-active')).toBe('true');
    expect(tab).toHaveStyle({ background: '#FAF8F3' });
  });

  it('marks inactive tab with data-active=false and transparent background', () => {
    render(<Tab filename="inactive.md" active={false} dirty={false} />);
    const tab = screen.getByTestId('tab');
    expect(tab.getAttribute('data-active')).toBe('false');
    expect(tab).toHaveStyle({ background: 'transparent' });
  });

  it('fires onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Tab filename="x.md" active={false} dirty={false} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('tab'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
