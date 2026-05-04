import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Ridge } from '@/components/lore/Ridge';

describe('Ridge', () => {
  it('renders both back and front ridge svg paths', () => {
    const { getByTestId } = render(<Ridge />);
    expect(getByTestId('ridge-back')).toBeTruthy();
    expect(getByTestId('ridge-front')).toBeTruthy();
  });
});
