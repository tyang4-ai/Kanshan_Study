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

// r6 FIX 3 (颜鑫 R6 P0): synonym expansion. The vault entries' titles +
// snippets are bilingual (mix of 中文 + English oncology terms). A pure
// substring match on 中文 query "胶质母细胞瘤" misses entries whose title is
// "Stupp 2005 → 2025 二十年综述阅读笔记" or whose tags are ["GBM", "MGMT"].
// Expand each known axis term to its English/中文 aliases so any of them in
// the query routes to all related entries.
const SYNONYM_GROUPS: string[][] = [
  ['胶质母细胞瘤', 'gbm', 'glioblastoma', '胶母', '胶质瘤'],
  ['mgmt', '甲基化', 'mmgmt'],
  ['替莫唑胺', 'tmz', 'temozolomide'],
  ['stupp', '放化疗', '同步放化疗'],
  ['ttfields', '电场', '电场治疗', 'tumor treating fields', 'optune'],
  ['idh', '野生型', 'wildtype', 'wild-type'],
  ['who 分类', 'cns5', 'who cns', '中枢神经系统肿瘤分类'],
];

function expandSynonyms(q: string): string[] {
  const ql = q.toLowerCase();
  const expanded = new Set<string>([ql]);
  for (const group of SYNONYM_GROUPS) {
    if (group.some((s) => ql.includes(s))) {
      for (const s of group) expanded.add(s);
    }
  }
  return Array.from(expanded);
}

function fallback(query: string): SeedEntry[] {
  // Mock-mode (no DB / no embedder) seed — returns the same demo articles
  // to every guest so the UI has something to render. Production paths
  // (SUPABASE_DB_URL set) skip this entirely and query the guest's own rows.
  const all = meSeed as SeedEntry[];
  if (!query.trim()) return all;
  const needles = expandSynonyms(query);
  return all.filter((e) => {
    const hay = `${e.title} ${e.snippet} ${e.tags.join(' ')}`.toLowerCase();
    return needles.some((n) => hay.includes(n));
  });
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
