import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let cachedClient: ReturnType<typeof postgres> | undefined;
let cachedDb: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (cachedDb) return cachedDb;
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error('SUPABASE_DB_URL is not set — run pnpm tsx scripts/ingest-corpus.ts after dropping creds in app/.env.local');
  }
  cachedClient = postgres(url, { prepare: false });
  cachedDb = drizzle(cachedClient, { schema });
  return cachedDb;
}

// Convenience export — calls getDb() lazily on first access.
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    const real = getDb();
    const value = (real as unknown as Record<string, unknown>)[prop as string];
    return typeof value === 'function' ? value.bind(real) : value;
  },
});
