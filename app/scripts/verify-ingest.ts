// Quick verification: count rows in articles + chunks for guwanxi.
import { sql } from 'drizzle-orm';
import { getDb } from '../lib/db/client';

async function main() {
  const db = getDb();
  const articles = await db.execute(sql`select count(*)::int as n from articles where user_id='guwanxi'`);
  const chunks = await db.execute(sql`select count(*)::int as n from chunks where user_id='guwanxi'`);
  const sample = await db.execute(sql`select id, title from articles where user_id='guwanxi' order by id`);
  console.log('articles:', (articles[0] as { n: number }).n);
  console.log('chunks:', (chunks[0] as { n: number }).n);
  console.log('titles:');
  for (const row of sample) {
    const r = row as { id: string; title: string };
    console.log(`  ${r.id} → ${r.title}`);
  }
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
