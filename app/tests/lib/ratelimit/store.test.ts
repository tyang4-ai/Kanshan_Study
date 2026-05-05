import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  db: { execute: vi.fn() },
}));

import { db } from '@/lib/db/client';
import {
  checkAndIncrement,
  releaseConcurrent,
  HOUR_LIMIT,
  DAY_LIMIT,
  CONCURRENT_LIMIT,
} from '@/lib/ratelimit/store';

const mockedExecute = vi.mocked(db.execute);

const NOW = new Date('2026-05-04T16:30:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkAndIncrement', () => {
  it('first call returns ok with counts=1', async () => {
    mockedExecute.mockResolvedValueOnce([
      {
        ip_hash: 'abc',
        day_bucket: '2026-05-04',
        hour_bucket: '2026-05-04T16',
        count_day: 1,
        count_hour: 1,
        concurrent: 1,
      },
    ] as never);
    const result = await checkAndIncrement('abc', NOW);
    expect(result).toEqual({ ok: true, count_hour: 1, count_day: 1 });
  });

  it('mid-range counts (e.g., 30) returns ok', async () => {
    mockedExecute.mockResolvedValueOnce([
      {
        ip_hash: 'abc',
        day_bucket: '2026-05-04',
        hour_bucket: '2026-05-04T16',
        count_day: 30,
        count_hour: 30,
        concurrent: 1,
      },
    ] as never);
    const result = await checkAndIncrement('abc', NOW);
    expect(result).toEqual({ ok: true, count_hour: 30, count_day: 30 });
  });

  it('count_hour at HOUR_LIMIT is still ok', async () => {
    mockedExecute.mockResolvedValueOnce([
      {
        ip_hash: 'abc',
        day_bucket: '2026-05-04',
        hour_bucket: '2026-05-04T16',
        count_day: HOUR_LIMIT,
        count_hour: HOUR_LIMIT,
        concurrent: 1,
      },
    ] as never);
    const result = await checkAndIncrement('abc', NOW);
    expect(result.ok).toBe(true);
  });

  it('count_hour above HOUR_LIMIT returns blocked mode=hour', async () => {
    mockedExecute.mockResolvedValueOnce([
      {
        ip_hash: 'abc',
        day_bucket: '2026-05-04',
        hour_bucket: '2026-05-04T16',
        count_day: HOUR_LIMIT + 1,
        count_hour: HOUR_LIMIT + 1,
        concurrent: 1,
      },
    ] as never);
    const result = await checkAndIncrement('abc', NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.mode).toBe('hour');
    // Next hour boundary at 17:00:00 UTC.
    expect(result.resetAt).toBe(new Date('2026-05-04T17:00:00.000Z').getTime());
  });

  it('count_day above DAY_LIMIT returns blocked mode=day', async () => {
    mockedExecute.mockResolvedValueOnce([
      {
        ip_hash: 'abc',
        day_bucket: '2026-05-04',
        hour_bucket: '2026-05-04T16',
        count_day: DAY_LIMIT + 1,
        count_hour: 5,
        concurrent: 1,
      },
    ] as never);
    const result = await checkAndIncrement('abc', NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.mode).toBe('day');
    expect(result.resetAt).toBe(new Date('2026-05-05T00:00:00.000Z').getTime());
  });

  it('concurrent above CONCURRENT_LIMIT returns blocked + decrements', async () => {
    mockedExecute
      .mockResolvedValueOnce([
        {
          ip_hash: 'abc',
          day_bucket: '2026-05-04',
          hour_bucket: '2026-05-04T16',
          count_day: 5,
          count_hour: 5,
          concurrent: CONCURRENT_LIMIT + 1,
        },
      ] as never)
      .mockResolvedValueOnce([] as never);
    const result = await checkAndIncrement('abc', NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.mode).toBe('concurrent');
    expect(mockedExecute).toHaveBeenCalledTimes(2); // upsert + rollback decrement
  });

  it('handles string-typed counters from PG numeric', async () => {
    mockedExecute.mockResolvedValueOnce([
      {
        ip_hash: 'abc',
        day_bucket: '2026-05-04',
        hour_bucket: '2026-05-04T16',
        count_day: '7',
        count_hour: '7',
        concurrent: '1',
      },
    ] as never);
    const result = await checkAndIncrement('abc', NOW);
    expect(result).toEqual({ ok: true, count_hour: 7, count_day: 7 });
  });

  it('returns ok with counts=1 fallback when no row returned', async () => {
    mockedExecute.mockResolvedValueOnce([] as never);
    const result = await checkAndIncrement('abc', NOW);
    expect(result).toEqual({ ok: true, count_hour: 1, count_day: 1 });
  });

  it('CONCURRENT_LIMIT is the boundary (exact = ok)', async () => {
    mockedExecute.mockResolvedValueOnce([
      {
        ip_hash: 'abc',
        day_bucket: '2026-05-04',
        hour_bucket: '2026-05-04T16',
        count_day: 5,
        count_hour: 5,
        concurrent: CONCURRENT_LIMIT,
      },
    ] as never);
    const result = await checkAndIncrement('abc', NOW);
    expect(result.ok).toBe(true);
  });
});

describe('releaseConcurrent', () => {
  it('issues an update query', async () => {
    mockedExecute.mockResolvedValueOnce([] as never);
    await releaseConcurrent('abc');
    expect(mockedExecute).toHaveBeenCalledTimes(1);
  });
});
