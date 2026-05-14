// r5 TASK D Fix 2: one-time backfill that materializes 顾婉昔's seed vault
// entries (app/content/seed/vault-guwanxi.json) as real `articles` + `chunks`
// rows under a target user_id. Run for new judge accounts after their first
// OAuth login so semantic search has real chunks to rank against (instead of
// relying on the seed-fallback merge in the search route).
//
// Usage:
//   pnpm dlx tsx scripts/backfill-vault-for-user.ts --user-id zhihu-<uid>
//
// Idempotent: skips an article id that already exists in the articles table.

import { sql } from 'drizzle-orm';
import { getDb } from '../lib/db/client';
import { embed } from '../lib/embeddings';
import seedJson from '../content/seed/vault-guwanxi.json';

interface SeedEntry {
  id: string;
  title: string;
  snippet: string;
  year: string;
  date: string;
  words: number;
  borrows: number;
  draft?: boolean;
  tags: string[];
  spine?: string;
}

function parseArg(name: string): string | null {
  const i = process.argv.indexOf(name);
  if (i < 0 || i === process.argv.length - 1) return null;
  return process.argv[i + 1];
}

async function main(): Promise<void> {
  const userId = parseArg('--user-id');
  if (!userId) {
    console.error('usage: tsx scripts/backfill-vault-for-user.ts --user-id <user-id>');
    process.exit(1);
  }
  const db = getDb();
  const entries = seedJson as SeedEntry[];

  // Ensure the user row exists (idempotent).
  await db.execute(sql`
    insert into users (id, display_name, bio)
    values (${userId}, ${`Backfilled (${userId})`}, ${'r5 vault-seed backfill'})
    on conflict (id) do nothing
  `);

  let articlesWritten = 0;
  let chunksWritten = 0;
  let skipped = 0;

  for (const e of entries) {
    const articleId = `${userId}::${e.id}`;
    const existing = await db.execute(sql`
      select id from articles where id = ${articleId} limit 1
    `);
    if ((existing as unknown as Array<{ id: string }>).length > 0) {
      skipped++;
      continue;
    }
    await db.execute(sql`
      insert into articles (id, user_id, title, body, published_at, draft, tags, borrows, spine_color, word_count)
      values (
        ${articleId}, ${userId}, ${e.title}, ${e.snippet}, ${e.date},
        ${e.draft ?? false}, ${JSON.stringify(e.tags)}::jsonb,
        ${e.borrows}, ${e.spine ?? null}, ${e.words}
      )
    `);
    articlesWritten++;

    // One chunk per entry (snippet is the only body we have; ~250-500 chars).
    const [emb] = await embed([e.snippet]);
    await db.execute(sql`
      insert into chunks (id, article_id, user_id, ord, content, embedding)
      values (
        ${`${articleId}::chunk-0`}, ${articleId}, ${userId}, ${0}, ${e.snippet},
        ${JSON.stringify(emb)}::vector
      )
    `);
    chunksWritten++;
  }

  console.log(`[backfill-vault] user=${userId}: articles=${articlesWritten} chunks=${chunksWritten} skipped=${skipped}`);
}

main().catch((err) => {
  console.error('[backfill-vault] failed:', err);
  process.exit(1);
});
