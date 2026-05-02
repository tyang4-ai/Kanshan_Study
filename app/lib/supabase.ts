import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env';

let anonClient: SupabaseClient | undefined;
let adminClient: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (!anonClient) {
    const env = getEnv();
    anonClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }
  return anonClient;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const env = getEnv();
    adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}
