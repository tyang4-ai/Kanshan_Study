import { NextRequest, NextResponse } from 'next/server';
import meSeed from '@/content/seed/vault-me.json';
import { getAccountId } from '@/lib/account';

export const runtime = 'edge';

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
    const hits = await searchVault(userId, query, body.topK ?? 7);
    return NextResponse.json({ hits, source: 'live' });
  } catch (err) {
    console.error('vault search failed, falling back to seed:', err);
    return NextResponse.json({ hits: fallback(query), source: 'seed-fallback' });
  }
}
