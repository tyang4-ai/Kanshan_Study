import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ComplianceLine } from '@/components/compliance/ComplianceLine';

describe('ComplianceLine', () => {
  it('renders children with default neutral tone', () => {
    render(<ComplianceLine>hello</ComplianceLine>);
    const el = screen.getByTestId('compliance-line');
    expect(el).toHaveTextContent('hello');
    expect(el).toHaveAttribute('data-tone', 'neutral');
  });
  it('renders warn tone with different background', () => {
    render(<ComplianceLine tone="warn">warning text</ComplianceLine>);
    const el = screen.getByTestId('compliance-line');
    expect(el).toHaveAttribute('data-tone', 'warn');
  });
  it('preserves children React nodes', () => {
    render(<ComplianceLine><span data-testid="child">inner</span></ComplianceLine>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
