import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/cache/store', () => ({
  lookupCache: vi.fn(),
  writeCache: vi.fn(),
}));

import { lookupCache, writeCache } from '@/lib/cache/store';
import { withCache, modeFromHeaders, CacheMissError } from '@/lib/cache/wrap';

const mockedLookup = vi.mocked(lookupCache);
const mockedWrite = vi.mocked(writeCache);

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('withCache — auto mode', () => {
  beforeEach(() => vi.stubEnv('CACHE_MODE', 'auto'));

  it('hits cache → live not called', async () => {
    mockedLookup.mockResolvedValueOnce({ response: { cached: true }, similarity: 0.9 });
    const live = vi.fn();
    const result = await withCache('voice-fill', 'q', live);
    expect(result).toEqual({ cached: true });
    expect(live).not.toHaveBeenCalled();
  });

  it('miss → live called, result written', async () => {
    mockedLookup.mockResolvedValueOnce(null);
    const live = vi.fn().mockResolvedValue({ live: true });
    const result = await withCache('voice-fill', 'q', live);
    expect(result).toEqual({ live: true });
    expect(live).toHaveBeenCalledTimes(1);
    // writeCache fires async; await microtask
    await new Promise((r) => setTimeout(r, 0));
    expect(mockedWrite).toHaveBeenCalledWith('voice-fill', 'q', { live: true });
  });
});

describe('withCache — cache-only mode', () => {
  beforeEach(() => vi.stubEnv('CACHE_MODE', 'cache-only'));

  it('hit returns response', async () => {
    mockedLookup.mockResolvedValueOnce({ response: { ok: 1 }, similarity: 0.9 });
    const live = vi.fn();
    const result = await withCache('voice-fill', 'q', live);
    expect(result).toEqual({ ok: 1 });
    expect(live).not.toHaveBeenCalled();
  });

  it('miss throws CacheMissError', async () => {
    mockedLookup.mockResolvedValueOnce(null);
    const live = vi.fn();
    await expect(withCache('voice-fill', 'qmiss', live)).rejects.toBeInstanceOf(CacheMissError);
    expect(live).not.toHaveBeenCalled();
  });
});

describe('withCache — live-only mode', () => {
  beforeEach(() => vi.stubEnv('CACHE_MODE', 'live-only'));

  it('skips lookup, calls live, writes result', async () => {
    const live = vi.fn().mockResolvedValue({ x: 1 });
    const result = await withCache('voice-fill', 'q', live);
    expect(result).toEqual({ x: 1 });
    expect(mockedLookup).not.toHaveBeenCalled();
    expect(live).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockedWrite).toHaveBeenCalledWith('voice-fill', 'q', { x: 1 });
  });
});

describe('per-call override', () => {
  beforeEach(() => vi.stubEnv('CACHE_MODE', 'auto'));

  it('opts.mode = "cache-only" wins over env=auto', async () => {
    mockedLookup.mockResolvedValueOnce(null);
    const live = vi.fn();
    await expect(
      withCache('voice-fill', 'q', live, { mode: 'cache-only' }),
    ).rejects.toBeInstanceOf(CacheMissError);
    expect(live).not.toHaveBeenCalled();
  });

  it('opts.mode = "live-only" skips lookup', async () => {
    const live = vi.fn().mockResolvedValue({ ok: true });
    await withCache('voice-fill', 'q', live, { mode: 'live-only' });
    expect(mockedLookup).not.toHaveBeenCalled();
    expect(live).toHaveBeenCalled();
  });
});

describe('modeFromHeaders', () => {
  it('reads x-kanshan-cache-mode header', () => {
    const h = new Headers({ 'x-kanshan-cache-mode': 'cache-only' });
    expect(modeFromHeaders(h)).toBe('cache-only');
  });

  it('returns undefined for absent or invalid header', () => {
    expect(modeFromHeaders(new Headers())).toBeUndefined();
    expect(modeFromHeaders(new Headers({ 'x-kanshan-cache-mode': 'bogus' }))).toBeUndefined();
  });
});

describe('in-flight dedup', () => {
  beforeEach(() => vi.stubEnv('CACHE_MODE', 'auto'));

  it('concurrent calls with same kind+intent share one live call', async () => {
    mockedLookup.mockResolvedValue(null);
    let resolveLive!: (v: unknown) => void;
    const live = vi.fn().mockImplementation(
      () => new Promise((r) => { resolveLive = r; }),
    );

    const a = withCache('voice-fill', 'shared', live);
    const b = withCache('voice-fill', 'shared', live);
    // Wait for both to traverse the lookup phase; only one inflight live call.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(live).toHaveBeenCalledTimes(1);

    resolveLive!({ result: 1 });
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra).toEqual({ result: 1 });
    expect(rb).toEqual({ result: 1 });
  });
});
