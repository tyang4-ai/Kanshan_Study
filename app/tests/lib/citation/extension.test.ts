import { describe, it, expect } from 'vitest';
import { CitationMark } from '@/lib/citation/extension';

describe('CitationMark', () => {
  it('has name "citation"', () => {
    expect(CitationMark.name).toBe('citation');
    expect(CitationMark.config.name).toBe('citation');
  });

  it('parseHTML targets sup[data-citation-id]', () => {
    const parsed = (CitationMark.config.parseHTML as () => Array<{ tag: string }>)();
    expect(parsed).toEqual([{ tag: 'sup[data-citation-id]' }]);
  });

  it('addAttributes returns citationId, kind, label', () => {
    const attrs = (CitationMark.config.addAttributes as () => Record<string, unknown>)();
    expect(Object.keys(attrs).sort()).toEqual(['citationId', 'kind', 'label']);
  });

  it('default kind is "web"', () => {
    const attrs = (CitationMark.config.addAttributes as () => Record<
      string,
      { default: unknown }
    >)();
    expect(attrs.kind.default).toBe('web');
  });

  it('default citationId is null', () => {
    const attrs = (CitationMark.config.addAttributes as () => Record<
      string,
      { default: unknown }
    >)();
    expect(attrs.citationId.default).toBe(null);
  });

  it('default label is "[1]"', () => {
    const attrs = (CitationMark.config.addAttributes as () => Record<
      string,
      { default: unknown }
    >)();
    expect(attrs.label.default).toBe('[1]');
  });

  it('is configured as non-inclusive', () => {
    expect(CitationMark.config.inclusive).toBe(false);
  });
});
