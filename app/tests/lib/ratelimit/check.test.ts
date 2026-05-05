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
  it('BYO key (Bearer sk-...) bypasses rate limit', async () => {
    const req = makeReq({ authorization: 'Bearer sk-validkey' });
    const result = await requireRateLimitOk(req);
    expect(result).toBeNull();
    expect(mockedCheck).not.toHaveBeenCalled();
  });

  it('BYO key is case-insensitive on `bearer`', async () => {
    const req = makeReq({ authorization: 'bearer sk-x' });
    const result = await requireRateLimitOk(req);
    expect(result).toBeNull();
    expect(mockedCheck).not.toHaveBeenCalled();
  });

  it('no cookie → returns null (let through edge case)', async () => {
    mockCookie(undefined);
    const req = makeReq({});
    const result = await requireRateLimitOk(req);
    expect(result).toBeNull();
    expect(mockedCheck).not.toHaveBeenCalled();
  });

  it('cookie present + ok → returns null', async () => {
    mockCookie('abc123def456');
    mockedCheck.mockResolvedValueOnce({ ok: true, count_hour: 1, count_day: 1 });
    const req = makeReq({});
    const result = await requireRateLimitOk(req);
    expect(result).toBeNull();
    expect(mockedCheck).toHaveBeenCalledWith('abc123def456');
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

  it('Authorization without sk- prefix does NOT bypass', async () => {
    mockCookie('abc');
    mockedCheck.mockResolvedValueOnce({ ok: true, count_hour: 1, count_day: 1 });
    const req = makeReq({ authorization: 'Bearer some-other-token' });
    await requireRateLimitOk(req);
    expect(mockedCheck).toHaveBeenCalled();
  });
});
