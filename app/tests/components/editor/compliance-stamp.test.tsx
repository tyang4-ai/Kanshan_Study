import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useProvenanceStore } from '@/lib/store/provenance';
import { ComplianceStamp } from '@/components/editor/ComplianceStamp';

describe('ComplianceStamp', () => {
  beforeEach(() => {
    useProvenanceStore.setState({ entries: [] });
  });

  it('shows 待审 when store empty', () => {
    render(<ComplianceStamp />);
    expect(screen.getByText(/看心 · 待审/)).toBeInTheDocument();
  });

  it('shows 已审 with hedge count when only hedges present', () => {
    useProvenanceStore.setState({
      entries: [
        { id: '1', kind: 'hedge', excerpt: 'a', fox: 'xin', at: 0 },
        { id: '2', kind: 'hedge', excerpt: 'b', fox: 'xin', at: 1 },
      ],
    });
    render(<ComplianceStamp />);
    expect(screen.getByText(/看心 · 已审/)).toBeInTheDocument();
    expect(screen.getByText(/2 处声明软化/)).toBeInTheDocument();
    expect(screen.queryByText(/出处待补/)).not.toBeInTheDocument();
  });

  it('shows multiple counts when mixed', () => {
    useProvenanceStore.setState({
      entries: [
        { id: '1', kind: 'hedge', excerpt: 'a', fox: 'xin', at: 0 },
        { id: '2', kind: 'flagged', excerpt: 'b', fox: 'xin', at: 1 },
        { id: '3', kind: 'ai-touched', excerpt: 'c', fox: 'mo', at: 2 },
      ],
    });
    render(<ComplianceStamp />);
    expect(screen.getByText(/1 处声明软化/)).toBeInTheDocument();
    expect(screen.getByText(/1 处出处待补/)).toBeInTheDocument();
    expect(screen.getByText(/1 处 AI 协作段落/)).toBeInTheDocument();
  });
});
