import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComplianceStamp } from '@/components/editor/ComplianceStamp';

describe('ComplianceStamp', () => {
  it('renders all locked text segments', () => {
    render(<ComplianceStamp />);
    expect(screen.getByText('看心 · 已审')).toBeInTheDocument();
    expect(screen.getByText('1 处声明软化')).toBeInTheDocument();
    expect(screen.getByText('1 处出处待补')).toBeInTheDocument();
    expect(screen.getByText('16:42')).toBeInTheDocument();
  });
});
