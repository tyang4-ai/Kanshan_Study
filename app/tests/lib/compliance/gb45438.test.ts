import { describe, it, expect, beforeEach } from 'vitest';
import { useProvenanceStore } from '@/lib/store/provenance';
import { buildMetadata, stampMarkdown } from '@/lib/compliance/gb45438';

describe('gb45438 helper', () => {
  beforeEach(() => {
    useProvenanceStore.setState({ entries: [] });
  });

  it('builds metadata with zero counts when store empty', () => {
    const m = buildMetadata();
    expect(m.gb45438_2025).toBe(true);
    expect(m.provenance.aiTouchedSpans).toBe(0);
    expect(m.provenance.claims).toBe(0);
    expect(m.provenance.hedges).toBe(0);
    expect(m.provenance.sourced).toBe(0);
    expect(m.provenance.flagged).toBe(0);
    expect(m.models).toContain('DeepSeek-V3');
  });

  it('counts entries by kind', () => {
    useProvenanceStore.setState({
      entries: [
        { id: '1', kind: 'ai-touched', excerpt: 'a', fox: 'mo', at: 0 },
        { id: '2', kind: 'ai-touched', excerpt: 'b', fox: 'mo', at: 1 },
        { id: '3', kind: 'hedge', excerpt: 'c', fox: 'xin', at: 2 },
        { id: '4', kind: 'sourced', excerpt: 'd', fox: 'shui', at: 3 },
      ],
    });
    const m = buildMetadata();
    expect(m.provenance.aiTouchedSpans).toBe(2);
    expect(m.provenance.hedges).toBe(1);
    expect(m.provenance.sourced).toBe(1);
    expect(m.provenance.claims).toBe(0);
  });

  it('stampMarkdown wraps content with frontmatter and explicit footer', () => {
    const out = stampMarkdown('# Title\n\nbody');
    expect(out.startsWith('---\n')).toBe(true);
    expect(out).toContain('gb_45438_2025: true');
    expect(out).toContain('# Title\n\nbody');
    expect(out.endsWith('GB 45438-2025 标识）')).toBe(true);
  });

  it('preserves content body unchanged', () => {
    const body = 'arbitrary content\nwith newlines\n\nand things';
    const out = stampMarkdown(body);
    expect(out).toContain(body);
  });
});
