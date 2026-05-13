import { NextRequest, NextResponse } from 'next/server';
import meSeed from '@/content/seed/vault-me.json';
import { chunkMarkdown } from '@/lib/vault/chunker';
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
  body?: string;
  chunks?: string[];
}

interface ChunkPreview {
  id: string;
  text: string;
  charCount: number;
  position: number;
}

function seedChunks(entry: SeedEntry): string[] {
  if (Array.isArray(entry.chunks) && entry.chunks.length > 0) return entry.chunks;
  if (typeof entry.body === 'string' && entry.body.trim().length > 0) {
    return chunkMarkdown(entry.body);
  }
  return [];
}

function previewsFrom(articleId: string, raw: string[]): ChunkPreview[] {
  return raw.map((text, i) => ({
    id: `${articleId}-c${i}`,
    text,
    charCount: text.length,
    position: i,
  }));
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } | { params: { id: string } },
) {
  const params =
    'then' in (ctx.params as Promise<{ id: string }>)
      ? await (ctx.params as Promise<{ id: string }>)
      : (ctx.params as { id: string });
  const articleId = params.id;
  const userId = getAccountId(req);

  if (!articleId) {
    return NextResponse.json({ error: 'article id required' }, { status: 400 });
  }

  // Seed/in-memory path: when DB env not configured, look up the seed
  if (!process.env.SUPABASE_DB_URL || !process.env.SILICONFLOW_API_KEY) {
    const seed = meSeed as SeedEntry[];
    const entry = seed.find((e) => e.id === articleId);
    if (!entry) {
      return NextResponse.json({ error: 'article not found' }, { status: 404 });
    }
    const raw = seedChunks(entry);
    const chunks = previewsFrom(articleId, raw);
    return NextResponse.json({
      articleId,
      chunks,
      inMemoryFallback: chunks.length === 0,
    });
  }

  try {
    const { getDb } = await import('@/lib/db/client');
    const { articles, chunks: chunksTable } = await import('@/lib/db/schema');
    const { and, eq, asc } = await import('drizzle-orm');

    const db = getDb();
    const owned = await db
      .select({ id: articles.id })
      .from(articles)
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId)))
      .limit(1);
    if (owned.length === 0) {
      return NextResponse.json({ error: 'article not found' }, { status: 404 });
    }

    const rows = await db
      .select({
        id: chunksTable.id,
        ord: chunksTable.ord,
        content: chunksTable.content,
      })
      .from(chunksTable)
      .where(and(eq(chunksTable.articleId, articleId), eq(chunksTable.userId, userId)))
      .orderBy(asc(chunksTable.ord));

    return NextResponse.json({
      articleId,
      chunks: rows.map((r) => ({
        id: r.id,
        text: r.content,
        charCount: r.content.length,
        position: r.ord,
      })),
    });
  } catch {
    // DB error → fall through to seed lookup
    const seed = meSeed as SeedEntry[];
    const entry = seed.find((e) => e.id === articleId);
    if (!entry) {
      return NextResponse.json({ error: 'article not found' }, { status: 404 });
    }
    const raw = seedChunks(entry);
    return NextResponse.json({
      articleId,
      chunks: previewsFrom(articleId, raw),
      inMemoryFallback: true,
    });
  }
}
