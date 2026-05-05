// Postgres-backed rate-limit buckets keyed by ip_hash.
// Increments hour/day/concurrent counters, resetting hour/day when the bucket
// label changes. Returns { ok: true, ... } when within all limits, otherwise
// { ok: false, mode, resetAt }.

import { sql } from 'drizzle-orm';
import { db } from '../db/client';

export const HOUR_LIMIT = 60;
export const DAY_LIMIT = 200;
export const CONCURRENT_LIMIT = 3;

export type RateCheckResult =
  | { ok: true; count_hour: number; count_day: number }
  | { ok: false; mode: 'hour' | 'day' | 'concurrent'; resetAt: number };

function dayBucket(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function hourBucket(d: Date): string {
  return d.toISOString().slice(0, 13);
}

function nextHourBoundary(d: Date): number {
  const next = new Date(d);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(next.getUTCHours() + 1);
  return next.getTime();
}

function nextDayBoundary(d: Date): number {
  const next = new Date(d);
  next.setUTCHours(0, 0, 0, 0);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime();
}

interface Row {
  ip_hash: string;
  day_bucket: string;
  hour_bucket: string;
  count_day: number | string;
  count_hour: number | string;
  concurrent: number | string;
}

export async function checkAndIncrement(
  ipHash: string,
  now: Date = new Date(),
): Promise<RateCheckResult> {
  const day = dayBucket(now);
  const hour = hourBucket(now);

  // Upsert: if row exists, reset counters when bucket label changed; otherwise
  // increment. Always increment concurrent. Returns the post-update row so we
  // can decide whether to allow.
  const rows = (await db.execute(sql`
    insert into rate_limit (ip_hash, day_bucket, hour_bucket, count_day, count_hour, concurrent, updated_at)
    values (${ipHash}, ${day}, ${hour}, 1, 1, 1, now())
    on conflict (ip_hash) do update set
      day_bucket = ${day},
      hour_bucket = ${hour},
      count_day = case when rate_limit.day_bucket = ${day} then rate_limit.count_day + 1 else 1 end,
      count_hour = case when rate_limit.hour_bucket = ${hour} then rate_limit.count_hour + 1 else 1 end,
      concurrent = rate_limit.concurrent + 1,
      updated_at = now()
    returning ip_hash, day_bucket, hour_bucket, count_day, count_hour, concurrent
  `)) as unknown as Row[];

  const row = rows[0];
  if (!row) {
    return { ok: true, count_hour: 1, count_day: 1 };
  }

  const countHour = typeof row.count_hour === 'string' ? Number(row.count_hour) : row.count_hour;
  const countDay = typeof row.count_day === 'string' ? Number(row.count_day) : row.count_day;
  const concurrent = typeof row.concurrent === 'string' ? Number(row.concurrent) : row.concurrent;

  if (concurrent > CONCURRENT_LIMIT) {
    // Roll back the concurrent bump so we don't deadlock the bucket.
    await db.execute(sql`
      update rate_limit set concurrent = greatest(concurrent - 1, 0), updated_at = now()
      where ip_hash = ${ipHash}
    `);
    return { ok: false, mode: 'concurrent', resetAt: now.getTime() + 30_000 };
  }

  if (countHour > HOUR_LIMIT) {
    return { ok: false, mode: 'hour', resetAt: nextHourBoundary(now) };
  }

  if (countDay > DAY_LIMIT) {
    return { ok: false, mode: 'day', resetAt: nextDayBoundary(now) };
  }

  return { ok: true, count_hour: countHour, count_day: countDay };
}

export async function releaseConcurrent(ipHash: string): Promise<void> {
  await db.execute(sql`
    update rate_limit set concurrent = greatest(concurrent - 1, 0), updated_at = now()
    where ip_hash = ${ipHash}
  `);
}
