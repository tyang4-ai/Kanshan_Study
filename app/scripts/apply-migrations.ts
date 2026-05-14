// One-off: apply every .sql file in ./drizzle/ to Supabase, in order. Idempotent
// because every CREATE TABLE in this repo uses `IF NOT EXISTS`. Safe to re-run.
//
// Usage:  pnpm tsx scripts/apply-migrations.ts

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';

async function main(): Promise<void> {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error('SUPABASE_DB_URL missing — load .env.local first');
  }
  const dir = join(process.cwd(), 'drizzle');
  const files = (await readdir(dir))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  console.log(`[migrations] found ${files.length} files in ./drizzle/`);

  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    for (const f of files) {
      const body = await readFile(join(dir, f), 'utf8');
      console.log(`[migrations] applying ${f} (${body.length} bytes)`);
      await sql.unsafe(body);
      console.log(`[migrations] ✓ ${f}`);
    }
    // Quick verify
    const tables = await sql`
      select table_name from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `;
    console.log('[migrations] public schema now contains:');
    for (const t of tables) console.log(`  - ${t.table_name}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

void main().catch((err) => {
  console.error('[migrations] FAILED', err);
  process.exit(1);
});
