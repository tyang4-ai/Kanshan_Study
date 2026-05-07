// Direct CREATE TABLE IF NOT EXISTS — bypasses drizzle's migration tracker.
// Run when `pnpm exec drizzle-kit migrate` reports "applied successfully" but
// the table is missing (Supabase reset, schema drift, etc.).
//
// Usage: pnpm dlx dotenv-cli -e .env.local -- pnpm tsx scripts/ensure-tables.ts

import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error('SUPABASE_DB_URL missing');
  const sql = postgres(url, { max: 1 });

  const file = path.resolve(__dirname, '..', 'drizzle', '0001_demo_cache_and_rate_limit.sql');
  const stmts = fs.readFileSync(file, 'utf-8');
  console.log('Running 0001_demo_cache_and_rate_limit.sql against', new URL(url).host);

  // postgres-js handles multi-statement files via .unsafe()
  await sql.unsafe(stmts);

  // Verify
  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name in ('demo_cache', 'rate_limit')
  `;
  console.log('Tables present:', tables.map((t) => t.table_name).sort().join(', '));

  await sql.end();
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
