import { describe, it, expect, beforeEach, vi } from 'vitest';

const createClientMock = vi.fn((url: string, key: string, opts?: unknown) => ({
  __url: url,
  __key: key,
  __opts: opts,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (url: string, key: string, opts?: unknown) => createClientMock(url, key, opts),
}));

vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  }),
}));

beforeEach(() => {
  createClientMock.mockClear();
  vi.resetModules();
});

describe('getSupabase / getSupabaseAdmin', () => {
  it('getSupabase uses the anon key, not the service-role key', async () => {
    const { getSupabase } = await import('@/lib/supabase');
    const client = getSupabase() as unknown as { __key: string };
    expect(client.__key).toBe('anon-key');
    expect(client.__key).not.toBe('service-role-key');
  });

  it('getSupabaseAdmin uses the service-role key with persistSession=false', async () => {
    const { getSupabaseAdmin } = await import('@/lib/supabase');
    const admin = getSupabaseAdmin() as unknown as {
      __key: string;
      __opts: { auth: { persistSession: boolean; autoRefreshToken: boolean } };
    };
    expect(admin.__key).toBe('service-role-key');
    expect(admin.__opts.auth.persistSession).toBe(false);
    expect(admin.__opts.auth.autoRefreshToken).toBe(false);
  });

  it('getSupabase memoizes — repeated calls return the same instance', async () => {
    const { getSupabase } = await import('@/lib/supabase');
    const a = getSupabase();
    const b = getSupabase();
    expect(a).toBe(b);
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  it('getSupabaseAdmin memoizes — repeated calls return the same instance', async () => {
    const { getSupabaseAdmin } = await import('@/lib/supabase');
    const a = getSupabaseAdmin();
    const b = getSupabaseAdmin();
    expect(a).toBe(b);
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  it('anon and admin clients are distinct instances with different keys', async () => {
    const { getSupabase, getSupabaseAdmin } = await import('@/lib/supabase');
    const anon = getSupabase() as unknown as { __key: string };
    const admin = getSupabaseAdmin() as unknown as { __key: string };
    expect(anon).not.toBe(admin);
    expect(anon.__key).not.toBe(admin.__key);
  });
});
