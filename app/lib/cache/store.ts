// Cache lookup + write against the `demo_cache` Postgres table.
// Cosine similarity ≥ HIT_THRESHOLD counts as a hit; otherwise null.

import { sql } from 'drizzle-orm';
import { db } from '../db/client';
import { embed } from '../embeddings';

export const HIT_THRESHOLD = 0.85;

export type CacheKind =
  | 'voice-fill'
  | 'voice-diff'
  | 'persona-panel'
  | 'persona-followup'
  | 'persona-debate'
  | 'custom-mask'
  | 'research'
  | 'compliance'
  | 'account-switch'
  | 'tail-click'
  | 'lore'
  | 'chat';

export interface LookupHit<T = unknown> {
  response: T;
  similarity: number;
}

export async function lookupCache<T = unknown>(
  kind: CacheKind | string,
  intent: string,
): Promise<LookupHit<T> | null> {
  const [emb] = await embed([intent]);
  const vec = JSON.stringify(emb);
  const rows = await db.execute(sql`
    select id, response, 1 - (intent_embedding <=> ${vec}::vector) as similarity
    from demo_cache
    where kind = ${kind}
    order by intent_embedding <=> ${vec}::vector
    limit 1
  `);
  const list = rows as unknown as Array<{ id: string; response: T; similarity: number | string }>;
  if (list.length === 0) return null;
  const top = list[0];
  const sim = typeof top.similarity === 'string' ? Number(top.similarity) : top.similarity;
  if (sim < HIT_THRESHOLD) return null;
  return { response: top.response, similarity: sim };
}

export async function writeCache(
  kind: CacheKind | string,
  intent: string,
  response: unknown,
): Promise<void> {
  const [emb] = await embed([intent]);
  const id = `${kind}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await db.execute(sql`
    insert into demo_cache (id, kind, intent_text, intent_embedding, response, created_at)
    values (${id}, ${kind}, ${intent}, ${JSON.stringify(emb)}::vector, ${JSON.stringify(response)}::jsonb, now())
    on conflict (kind, intent_text) do update
      set response = excluded.response,
          intent_embedding = excluded.intent_embedding,
          created_at = now()
  `);
}

export async function clearCache(kind?: CacheKind | string): Promise<void> {
  if (kind) {
    await db.execute(sql`delete from demo_cache where kind = ${kind}`);
  } else {
    await db.execute(sql`delete from demo_cache`);
  }
}

export async function countCache(kind?: CacheKind | string): Promise<number> {
  const rows = kind
    ? await db.execute(sql`select count(*)::int as n from demo_cache where kind = ${kind}`)
    : await db.execute(sql`select count(*)::int as n from demo_cache`);
  const row = (rows as unknown as Array<{ n: number }>)[0];
  return row?.n ?? 0;
}
