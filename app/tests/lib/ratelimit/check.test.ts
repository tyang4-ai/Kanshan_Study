import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/ratelimit/store', () => ({
  checkAndIncrement: vi.fn(),
  releaseConcurrent: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { cookies } from 'next/headers';
import { checkAndIncrement } from '@/lib/ratelimit/store';
import { requireRateLimitOk } from '@/lib/ratelimit/check';

const mockedCheck = vi.mocked(checkAndIncrement);
const mockedCookies = vi.mocked(cookies);

function makeReq(headers: Record<string, string> = {}): Request {
  const h = new Headers();
  for (const [k, v] of Object.entries(headers)) h.set(k, v);
  return { headers: h } as unknown as Request;
}

function mockCookie(value: string | undefined) {
  mockedCookies.mockResolvedValueOnce({
    get: (name: string) => (name === 'kanshan-guest-id' && value ? { value } : undefined),
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requireRateLimitOk', () => {
  // R6 security review (Hu Wei) P1: BYO-key holders no longer bypass the
  // limiter outright — they get a higher cap via `multiplier: 8` instead, so
  // a fan-out attacker with a bogus `Bearer sk-X` still gets metered.
  it('BYO key (Bearer sk-...) gets metered with 8× multiplier', async () => {
    mockCookie('abc');
    mockedCheck.mockResolvedValueOnce({ ok: true, count_hour: 1, count_day: 1 });
    const req = makeReq({ authorization: 'Bearer sk-validkey' });
    const result = await requireRateLimitOk(req);
    expect(result).toBeNull();
    expect(mockedCheck).toHaveBeenCalledWith('abc', { multiplier: 8 });
  });

  it('BYO key is case-insensitive on `bearer`', async () => {
    mockCookie('abc');
    mockedCheck.mockResolvedValueOnce({ ok: true, count_hour: 1, count_day: 1 });
    const req = makeReq({ authorization: 'bearer sk-x' });
    const result = await requireRateLimitOk(req);
    expect(result).toBeNull();
    expect(mockedCheck).toHaveBeenCalledWith('abc', { multiplier: 8 });
  });

  // R6 security review (Hu Wei) P1: previously `if (!guestId) return null` —
  // a script that re-rolls its cookie jar could fan out unmetered. Now we
  // synthesize the same IP+UA hash the middleware would set so the very first
  // request is metered too.
  it('no cookie → still meters using IP+UA hash', async () => {
    mockCookie(undefined);
    mockedCheck.mockResolvedValueOnce({ ok: true, count_hour: 1, count_day: 1 });
    const req = makeReq({ 'x-forwarded-for': '203.0.113.5', 'user-agent': 'Mozilla/5.0' });
    const result = await requireRateLimitOk(req);
    expect(result).toBeNull();
    expect(mockedCheck).toHaveBeenCalledOnce();
    const [hash] = mockedCheck.mock.calls[0];
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThanOrEqual(8);
  });

  it('cookie present + ok → returns null (no multiplier)', async () => {
    mockCookie('abc123def456');
    mockedCheck.mockResolvedValueOnce({ ok: true, count_hour: 1, count_day: 1 });
    const req = makeReq({});
    const result = await requireRateLimitOk(req);
    expect(result).toBeNull();
    expect(mockedCheck).toHaveBeenCalledWith('abc123def456', undefined);
  });

  it('cookie present + blocked → returns 429 Response with JSON body', async () => {
    mockCookie('abc123def456');
    mockedCheck.mockResolvedValueOnce({ ok: false, mode: 'hour', resetAt: 1234567890 });
    const req = makeReq({});
    const result = await requireRateLimitOk(req);
    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(429);
    expect(result?.headers.get('Content-Type')).toBe('application/json');
    const body = await result!.json();
    expect(body).toEqual({ error: 'rate-limit', mode: 'hour', resetAt: 1234567890 });
  });

  it('Authorization without sk- prefix does NOT trigger the BYO multiplier', async () => {
    mockCookie('abc');
    mockedCheck.mockResolvedValueOnce({ ok: true, count_hour: 1, count_day: 1 });
    const req = makeReq({ authorization: 'Bearer some-other-token' });
    await requireRateLimitOk(req);
    expect(mockedCheck).toHaveBeenCalledWith('abc', undefined);
  });
});
