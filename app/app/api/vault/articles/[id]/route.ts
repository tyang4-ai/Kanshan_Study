import { NextRequest, NextResponse } from 'next/server';
import { scrubErrorForClient } from '@/lib/errors/scrub';

export const runtime = 'nodejs';

function pickUserId(req: NextRequest): string {
  return req.headers.get('x-kanshan-account') === 'guwanxi' ? 'guwanxi' : 'me';
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const articleId = (id ?? '').trim();
  if (!articleId) {
    return NextResponse.json({ error: 'article id required' }, { status: 400 });
  }

  const userId = pickUserId(req);

  // Mock-mode: no DB configured → treat as a no-op success so the client UI
  // (which optimistically removes the entry) stays consistent with the demo.
  if (!process.env.SUPABASE_DB_URL || !process.env.SILICONFLOW_API_KEY) {
    return NextResponse.json({ deleted: true, source: 'mock' });
  }

  try {
    const { getDb } = await import('@/lib/db/client');
    const { articles, chunks } = await import('@/lib/db/schema');
    const { and, eq } = await import('drizzle-orm');

    const db = getDb();
    const owned = await db
      .select({ id: articles.id })
      .from(articles)
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId)));
    if (owned.length === 0) {
      return NextResponse.json({ error: 'article not found' }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(chunks)
        .where(and(eq(chunks.articleId, articleId), eq(chunks.userId, userId)));
      await tx
        .delete(articles)
        .where(and(eq(articles.id, articleId), eq(articles.userId, userId)));
    });

    return NextResponse.json({ deleted: true, source: 'live' });
  } catch (err) {
    const message = scrubErrorForClient(err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
