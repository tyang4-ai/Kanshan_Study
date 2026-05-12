import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ManualLink } from '@/components/chrome/TitleBar';

describe('TitleBar · ManualLink', () => {
  afterEach(() => cleanup());

  it('points at /manual and opens in a new tab with noopener', () => {
    const { getByTestId } = render(<ManualLink />);
    const link = getByTestId('manual-link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/manual');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.textContent).toContain('帮助');
  });
});
