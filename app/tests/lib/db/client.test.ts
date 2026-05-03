import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('db/client', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('getDb() throws when SUPABASE_DB_URL is unset', async () => {
    vi.stubEnv('SUPABASE_DB_URL', '');
    const { getDb } = await import('@/lib/db/client');
    expect(() => getDb()).toThrow(/SUPABASE_DB_URL is not set/);
  });

  it('getDb() throws with informative message mentioning ingest-corpus', async () => {
    vi.stubEnv('SUPABASE_DB_URL', '');
    const { getDb } = await import('@/lib/db/client');
    expect(() => getDb()).toThrow(/ingest-corpus/);
  });
});
