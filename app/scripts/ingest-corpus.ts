// pnpm tsx scripts/ingest-corpus.ts <userId> <corpus-dir>
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { getDb } from '../lib/db/client';
import { users, articles, chunks } from '../lib/db/schema';
import { chunkMarkdown } from '../lib/vault/chunker';
import { embed } from '../lib/embeddings';

async function main() {
  const [userId, dir] = process.argv.slice(2);
  if (!userId || !dir) {
    console.error('usage: ingest-corpus <userId> <dir>');
    process.exit(1);
  }
  if (!process.env.SUPABASE_DB_URL) {
    console.warn('SUPABASE_DB_URL unset — skipping ingest. Drop creds in app/.env.local first.');
    process.exit(0);
  }
  if (!process.env.SILICONFLOW_API_KEY) {
    console.warn('SILICONFLOW_API_KEY unset — skipping ingest. Drop creds in app/.env.local first.');
    process.exit(0);
  }
  if (!fs.existsSync(dir)) {
    console.warn(`dir not found: ${dir}`);
    process.exit(0);
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    console.warn(`no .md files in ${dir}`);
    process.exit(0);
  }

  const db = getDb();

  // Upsert user so FK constraints don't fail.
  await db.insert(users).values({
    id: userId,
    displayName: userId === 'guwanxi' ? '顾婉昔' : '我',
    bio: userId === 'guwanxi' ? '放射肿瘤学 · 知乎答主 · 演示账号 (虚构)' : 'SCU 生物工程',
  }).onConflictDoNothing();

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    const { data, content } = matter(raw);
    const articleId = `${userId}-${path.basename(file, '.md')}`;
    await db.insert(articles).values({
      id: articleId,
      userId,
      title: typeof data.title === 'string' ? data.title : path.basename(file, '.md'),
      body: content,
      publishedAt: typeof data.date === 'string' ? data.date : null,
      draft: typeof data.draft === 'boolean' ? data.draft : false,
      tags: Array.isArray(data.tags) ? data.tags : [],
      borrows: typeof data.borrows === 'number' ? data.borrows : 0,
      spineColor: typeof data.spine === 'string' ? data.spine : null,
      wordCount: content.length,
    }).onConflictDoNothing();

    const chunked = chunkMarkdown(content);
    if (chunked.length === 0) continue;
    const embs = await embed(chunked);
    await db.insert(chunks).values(
      chunked.map((c, i) => ({
        id: `${articleId}-c${i}`,
        articleId,
        userId,
        ord: i,
        content: c,
        embedding: embs[i],
      }))
    ).onConflictDoNothing();
    console.log(`ingested ${file} (${chunked.length} chunks)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
