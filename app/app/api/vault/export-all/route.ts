import { NextRequest, NextResponse } from 'next/server';
import { scrubErrorForClient } from '@/lib/errors/scrub';
import { requireRateLimitOk } from '@/lib/ratelimit/check';
import meSeed from '@/content/seed/vault-guwanxi.json';
import { getAccountId } from '@/lib/account';

export const runtime = 'nodejs';

interface SeedEntry {
  id: string;
  title: string;
  snippet: string;
  year: string;
  date: string;
  words: number;
  borrows?: number;
  draft?: boolean;
  tags: string[];
  spine?: string;
}

interface ExportArticle {
  id: string;
  title: string;
  content: string;
  tags: string[];
  chunkCount: number;
  createdAt: string;
}

interface ExportResponse {
  exportedAt: string;
  account: string;
  totalArticles: number;
  totalChunks: number;
  articles: ExportArticle[];
  inMemoryFallback?: boolean;
}

function fromSeed(userId: string): ExportResponse {
  const all = meSeed as SeedEntry[];
  const articles: ExportArticle[] = all.map((e) => ({
    id: e.id,
    title: e.title,
    content: e.snippet,
    tags: e.tags,
    chunkCount: 0,
    createdAt: e.date,
  }));
  return {
    exportedAt: new Date().toISOString(),
    account: userId,
    totalArticles: articles.length,
    totalChunks: 0,
    articles,
    inMemoryFallback: true,
  };
}

export async function GET(req: NextRequest) {
  // Bulk exfiltration vector — rate-limit so a scrape can't fan out cheaply.
  const limited = await requireRateLimitOk(req);
  if (limited) return limited;

  const userId = getAccountId(req);

  if (!process.env.SUPABASE_DB_URL) {
    return NextResponse.json(fromSeed(userId));
  }

  try {
    const { getDb } = await import('@/lib/db/client');
    const { articles, chunks } = await import('@/lib/db/schema');
    const { eq, sql } = await import('drizzle-orm');

    const db = getDb();
    const rows = await db.select().from(articles).where(eq(articles.userId, userId));

    const out: ExportArticle[] = [];
    let totalChunks = 0;
    for (const row of rows) {
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(chunks)
        .where(eq(chunks.articleId, row.id));
      const chunkCount = countResult[0]?.count ?? 0;
      totalChunks += chunkCount;
      out.push({
        id: row.id,
        title: row.title,
        content: row.body,
        tags: row.tags,
        chunkCount,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      });
    }

    const response: ExportResponse = {
      exportedAt: new Date().toISOString(),
      account: userId,
      totalArticles: out.length,
      totalChunks,
      articles: out,
    };
    return NextResponse.json(response);
  } catch (err) {
    const message = scrubErrorForClient(err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
