import { describe, it, expect } from 'vitest';
import { hashGuestId } from '@/lib/guest/id';

describe('hashGuestId', () => {
  it('returns 12-char hex string', async () => {
    const id = await hashGuestId('1.2.3.4', 'Mozilla/5.0');
    expect(id).toMatch(/^[a-f0-9]{12}$/);
  });

  it('is deterministic across calls', async () => {
    const a = await hashGuestId('1.2.3.4', 'Mozilla/5.0');
    const b = await hashGuestId('1.2.3.4', 'Mozilla/5.0');
    expect(a).toBe(b);
  });

  it('different IPs produce different hashes', async () => {
    const a = await hashGuestId('1.2.3.4', 'Mozilla/5.0');
    const b = await hashGuestId('5.6.7.8', 'Mozilla/5.0');
    expect(a).not.toBe(b);
  });

  it('different UAs produce different hashes', async () => {
    const a = await hashGuestId('1.2.3.4', 'Mozilla/5.0');
    const b = await hashGuestId('1.2.3.4', 'Chrome/120');
    expect(a).not.toBe(b);
  });

  it('empty inputs still produce 12-char hex via fallback tokens', async () => {
    const id = await hashGuestId('', '');
    expect(id).toMatch(/^[a-f0-9]{12}$/);
  });

  it('empty input is deterministic', async () => {
    const a = await hashGuestId('', '');
    const b = await hashGuestId('', '');
    expect(a).toBe(b);
  });
});
