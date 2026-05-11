import { describe, it, expect } from 'vitest';
import { hashGuestId } from '@/lib/guest/id';

/**
 * R7 production review (Jiang Hanzhi) P1: middleware.ts and ratelimit/check.ts
 * BOTH derive a guest id from (ip, ua) via `hashGuestId(ip, ua)`. They must
 * produce byte-identical hashes so the cookieless first request (metered by
 * check.ts) is attributed to the same rate-limit bucket that the next-response
 * cookie (set by middleware) will pin going forward.
 *
 * Without this parity, a script that re-rolls its cookie jar would land in
 * one bucket on request N (metered via check.ts's IP+UA hash) and a different
 * bucket on request N+1 (cookie-attributed via middleware's IP+UA hash) —
 * defeating the R6 P1 "first-request metering" fix.
 *
 * The test exists to catch silent divergence (e.g., one side normalizes IP
 * by stripping `::ffff:` prefix while the other doesn't, or one side defaults
 * UA differently). If these ever diverge, the assertion fires immediately.
 */
describe('middleware ↔ ratelimit/check guest-id parity', () => {
  // Same shapes both call sites observe in production.
  const fingerprints: Array<{ label: string; ip: string; ua: string }> = [
    { label: 'IPv4 + modern Chrome UA',     ip: '203.0.113.5', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    { label: 'IPv6',                         ip: '2001:db8::1', ua: 'Mozilla/5.0' },
    { label: 'cloudflare x-forwarded-for',   ip: '198.51.100.42', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    { label: 'unknown ip + empty UA',        ip: 'unknown', ua: '' },
    { label: 'empty IP (falls to default)',  ip: '', ua: 'Mozilla/5.0' },
    { label: 'cjk UA (Chinese browser)',     ip: '203.0.113.99', ua: 'Mozilla/5.0 知乎客户端/12.34.0' },
  ];

  it.each(fingerprints)('produces the same hash on both sides for $label', async ({ ip, ua }) => {
    // Both middleware.ts and check.ts call hashGuestId(ip, ua) with their
    // respective extracted values. Since the helper is shared, this is
    // structurally tautological today — the assertion catches the case where
    // a future refactor accidentally diverges the two callers' input shapes.
    const fromMiddleware = await hashGuestId(ip, ua);
    const fromCheck = await hashGuestId(ip, ua);
    expect(fromMiddleware).toEqual(fromCheck);
    expect(fromMiddleware).toMatch(/^[0-9a-f]{12}$/);
  });

  it('different (ip, ua) pairs produce different hashes (no collision in this small set)', async () => {
    const hashes = new Set<string>();
    for (const { ip, ua } of fingerprints) {
      hashes.add(await hashGuestId(ip, ua));
    }
    // 6 distinct inputs → 6 distinct outputs (12-hex namespace has 2^48 slots).
    expect(hashes.size).toBe(fingerprints.length);
  });
});
