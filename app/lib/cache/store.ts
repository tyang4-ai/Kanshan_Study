// Cache lookup + write against the `demo_cache` Postgres table.
// Cosine similarity ≥ kind-specific threshold counts as a hit; otherwise null.

import { sql } from 'drizzle-orm';
import { db } from '../db/client';
import { embed } from '../embeddings';

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
  | 'chat'
  | 'kanshan-chat';

const FALLBACK_THRESHOLD = 0.85;

// Back-compat: `HIT_THRESHOLD` is the fallback used when the kind is an
// unknown string. Per-kind thresholds live in `THRESHOLD_BY_KIND` below.
export const HIT_THRESHOLD = FALLBACK_THRESHOLD;

const THRESHOLD_BY_KIND: Record<CacheKind, number> = {
  // Strict — false positive matters most for compliance (medical claims)
  compliance: 0.85,
  // Loose — voice fingerprint paraphrases land 0.75-0.85 typically
  'voice-fill': 0.75,
  'voice-diff': 0.78,
  // History-sensitive — small text changes mean different intent
  'persona-followup': 0.80,
  // Default mid-band
  'persona-panel': 0.78,
  'persona-debate': 0.78,
  research: 0.80,
  'custom-mask': 0.80,
  // Kinds not in the proposed map — sensible default
  'account-switch': 0.78,
  'tail-click': 0.78,
  chat: 0.78,
  // 看山 chat: 0.92 was rejecting identical-text intents on demo day because
  // BGE-M3 emits tiny non-determinism between seed-time and query-time. Lower
  // to 0.80 so the canonical kickoff reliably hits its seeded reply. The
  // substring fallback (lookupCacheSubstring) catches any near-miss.
  'kanshan-chat': 0.80,
};

export function thresholdFor(kind: CacheKind | string): number {
  return THRESHOLD_BY_KIND[kind as CacheKind] ?? FALLBACK_THRESHOLD;
}

export interface LookupHit<T = unknown> {
  response: T;
  similarity: number;
}

export async function lookupCache<T = unknown>(
  kind: CacheKind | string,
  intent: string,
): Promise<LookupHit<T> | null> {
  // Exact-text shortcut: verbatim match bypasses the embedding round-trip
  // entirely. Critical for kanshan-chat where typed prompt = seed intent;
  // BGE-M3 occasionally returns non-deterministic vectors so the cosine
  // path can miss even on identical strings.
  const exactRows = await db.execute(sql`
    select response from demo_cache
    where kind = ${kind} and intent_text = ${intent}
    limit 1
  `);
  const exactList = exactRows as unknown as Array<{ response: T }>;
  console.log(`[cache] exact-lookup kind=${kind} intent.len=${intent.length} hits=${exactList.length}`);
  if (exactList.length > 0) {
    return { response: exactList[0].response, similarity: 1.0 };
  }
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
  if (sim < thresholdFor(kind)) return null;
  return { response: top.response, similarity: sim };
}

/**
 * r5 TASK C (7 judges P0): literal-substring fallback for cache-miss.
 *
 * Cosine similarity misses when the user's `intent` is a tight substring of a
 * seeded intent (judge selected only the absolutist clause; seed has the full
 * paragraph) or a one-char variant. This function does a plain `ILIKE` query
 * against `intent_text` and returns the closest match by string length —
 * approximation that "the cached intent that most resembles ours in length"
 * is usually the right pick.
 *
 * Strict: only runs when the intent is ≥ 8 chars (avoid matching everything
 * with a single-character query). LIMIT 3 + JS-side length-proximity pick.
 */
export async function lookupCacheSubstring<T = unknown>(
  kind: CacheKind | string,
  intent: string,
): Promise<LookupHit<T> | null> {
  if (intent.length < 8) return null;
  // Build a relaxed needle: take 12-32 chars from the longest contiguous
  // CJK/alphanumeric run, escape `%` and `_` for ILIKE.
  const run = intent.match(/[\p{L}\p{N}\p{M}]{12,}/u)?.[0] ?? intent.slice(0, 24);
  const needle = run.slice(0, 32).replace(/[%_\\]/g, '\\$&');
  try {
    const rows = await db.execute(sql`
      select id, response, intent_text
      from demo_cache
      where kind = ${kind}
        and (intent_text ilike ${'%' + needle + '%'} or ${intent} ilike '%' || intent_text || '%')
      limit 3
    `);
    const list = rows as unknown as Array<{ id: string; response: T; intent_text: string }>;
    if (list.length === 0) return null;
    // Pick the closest-by-length match.
    list.sort((a, b) => Math.abs(a.intent_text.length - intent.length) - Math.abs(b.intent_text.length - intent.length));
    return { response: list[0].response, similarity: 0.9 };
  } catch (err) {
    console.warn('[cache] substring lookup failed:', (err as Error).message);
    return null;
  }
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
