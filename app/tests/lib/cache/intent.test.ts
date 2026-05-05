import { describe, it, expect } from 'vitest';
import { canonicalIntent } from '@/lib/cache/intent';

describe('canonicalIntent', () => {
  it('normalizes a plain string', () => {
    expect(canonicalIntent('  hello   world  ')).toBe('hello world');
    expect(canonicalIntent('a\r\nb')).toBe('a b');
  });

  it('is stable across object key reorder', () => {
    const a = canonicalIntent({ paragraph: 'p', mask: 'm', history: [] });
    const b = canonicalIntent({ history: [], mask: 'm', paragraph: 'p' });
    expect(a).toBe(b);
  });

  it('different history produces different canonical strings', () => {
    const r1 = canonicalIntent({ paragraph: 'p', mask: 'm', history: [] });
    const r2 = canonicalIntent({
      paragraph: 'p',
      mask: 'm',
      history: [{ role: 'user', text: 'followup A' }],
    });
    const r3 = canonicalIntent({
      paragraph: 'p',
      mask: 'm',
      history: [{ role: 'user', text: 'followup B' }],
    });
    expect(r1).not.toBe(r2);
    expect(r2).not.toBe(r3);
    expect(r1).not.toBe(r3);
  });

  it('normalizes whitespace inside string fields', () => {
    const a = canonicalIntent({ paragraph: 'a   b' });
    const b = canonicalIntent({ paragraph: 'a b' });
    expect(a).toBe(b);
  });

  it('treats different paragraph content as different', () => {
    const a = canonicalIntent({ paragraph: 'foo', mask: 'm' });
    const b = canonicalIntent({ paragraph: 'bar', mask: 'm' });
    expect(a).not.toBe(b);
  });
});
