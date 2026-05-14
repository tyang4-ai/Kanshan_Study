import { NextRequest, NextResponse } from 'next/server';
import meSeed from '@/content/seed/vault-guwanxi.json';
import { getAccountId } from '@/lib/account';

// Switched off edge runtime (2026-05-13) because the lib/account.ts identity
// resolver now imports verifySession from cookie-sign, which uses node:crypto.
// The route is a thin proxy over Supabase pgvector — runs fine on nodejs.
export const runtime = 'nodejs';

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

interface SearchBody {
  query?: string;
  topK?: number;
}

function fallback(query: string): SeedEntry[] {
  // Mock-mode (no DB / no embedder) seed — returns the same demo articles
  // to every guest so the UI has something to render. Production paths
  // (SUPABASE_DB_URL set) skip this entirely and query the guest's own rows.
  const all = meSeed as SeedEntry[];
  if (!query.trim()) return all;
  const q = query.toLowerCase();
  return all.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      e.snippet.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export async function POST(req: NextRequest) {
  let body: SearchBody;
  try {
    body = (await req.json()) as SearchBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const userId = getAccountId(req);
  const query = (body.query ?? '').toString();

  if (!process.env.SUPABASE_DB_URL || !process.env.SILICONFLOW_API_KEY) {
    return NextResponse.json({ hits: fallback(query), source: 'seed' });
  }

  try {
    const { searchVault } = await import('@/lib/vault/search');
    const topK = body.topK ?? 7;
    const hits = await searchVault(userId, query, topK);
    // r5 TASK D (5 judges P0: 周源/徐诗/李大海/emmett/颜鑫): the demo persona
    // 顾婉昔's vault content lives in vault-guwanxi.json, NOT in the production
    // `chunks` table — every authenticated judge gets `zhihu-${uid}` as their
    // user_id, none of which has those chunks. Without this merge, the
    // showcase Step-1 fan-out query "胶质母细胞瘤" returns empty from prod.
    // Strategy: if the user's own chunks return fewer than topK hits, append
    // the seed fallback (de-duped by id) so the headline demo query always
    // surfaces 顾婉昔's 10 archive entries. Real users with rich vaults stay
    // unaffected (their hits saturate topK before the merge kicks in).
    if (hits.length < topK) {
      const seedHits = fallback(query);
      const seenIds = new Set(hits.map((h) => h.articleId));
      const merged = [
        ...hits,
        ...seedHits
          .filter((s) => !seenIds.has(s.id))
          .slice(0, topK - hits.length)
          .map((s) => ({
            chunkId: `seed-${s.id}`,
            articleId: s.id,
            title: s.title,
            date: s.date,
            year: s.year,
            content: s.snippet,
            spineColor: s.spine ?? null,
            borrows: s.borrows,
            tags: s.tags,
            score: 0.7,
          })),
      ];
      return NextResponse.json({ hits: merged, source: merged.length > hits.length ? 'live+seed' : 'live' });
    }
    return NextResponse.json({ hits, source: 'live' });
  } catch (err) {
    console.error('vault search failed, falling back to seed:', err);
    return NextResponse.json({ hits: fallback(query), source: 'seed-fallback' });
  }
}
