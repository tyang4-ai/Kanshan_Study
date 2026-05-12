import { NextRequest, NextResponse } from 'next/server';
import { scrubErrorForClient } from '@/lib/errors/scrub';

export const runtime = 'nodejs';

function pickUserId(req: NextRequest): 'me' | 'guwanxi' {
  return req.headers.get('x-kanshan-account') === 'guwanxi' ? 'guwanxi' : 'me';
}

function isValidAccountHeader(req: NextRequest): boolean {
  const v = req.headers.get('x-kanshan-account');
  if (v === null) return true;
  return v === 'me' || v === 'guwanxi';
}

export async function DELETE(req: NextRequest) {
  if (!isValidAccountHeader(req)) {
    return NextResponse.json({ error: 'invalid x-kanshan-account header' }, { status: 400 });
  }
  const userId = pickUserId(req);

  if (!process.env.SUPABASE_DB_URL) {
    return NextResponse.json({
      deleted: true,
      articleCount: 0,
      chunkCount: 0,
      note: 'no DB configured — seed data untouched',
    });
  }

  try {
    const { getDb } = await import('@/lib/db/client');
    const { articles, chunks } = await import('@/lib/db/schema');
    const { eq, sql } = await import('drizzle-orm');

    const db = getDb();

    let articleCount = 0;
    let chunkCount = 0;
    await db.transaction(async (tx) => {
      const articleCountRes = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(articles)
        .where(eq(articles.userId, userId));
      articleCount = articleCountRes[0]?.count ?? 0;

      const chunkCountRes = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(chunks)
        .where(eq(chunks.userId, userId));
      chunkCount = chunkCountRes[0]?.count ?? 0;

      await tx.delete(chunks).where(eq(chunks.userId, userId));
      await tx.delete(articles).where(eq(articles.userId, userId));
    });

    return NextResponse.json({ deleted: true, articleCount, chunkCount });
  } catch (err) {
    const message = scrubErrorForClient(err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
