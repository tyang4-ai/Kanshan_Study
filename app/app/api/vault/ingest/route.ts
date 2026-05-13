import { NextRequest, NextResponse } from 'next/server';
import { chunkMarkdown } from '@/lib/vault/chunker';
import { scrubErrorForClient } from '@/lib/errors/scrub';
import { requireRateLimitOk } from '@/lib/ratelimit/check';
import { getAccountId } from '@/lib/account';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1MB hard cap

interface IngestBody {
  markdown?: string;
  title?: string;
  tags?: string[];
  spine?: string;
  draft?: boolean;
}

export async function POST(req: NextRequest) {
  // Embedding + DB write fan-out path — rate-limit before parsing body so a
  // bogus consent header can't waste the embedder quota.
  const limited = await requireRateLimitOk(req);
  if (limited) return limited;

  const cl = req.headers.get('content-length');
  if (cl && Number(cl) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: '文件过大 (>1MB)，请拆分后再传' }, { status: 413 });
  }

  // Vault data-handling consent gate.
  const consentHeader = req.headers.get('x-kanshan-vault-consent');
  if (consentHeader !== '1') {
    return NextResponse.json(
      { error: '档案库未开通 — 请在设置中同意条款' },
      { status: 403 },
    );
  }

  let body: IngestBody;
  try {
    body = (await req.json()) as IngestBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const markdown = (body.markdown ?? '').trim();
  const title = (body.title ?? '').trim();
  if (!markdown || !title) {
    return NextResponse.json({ error: 'markdown 与 title 必填' }, { status: 400 });
  }
  if (markdown.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: '文件过大 (>1MB)，请拆分后再传' }, { status: 413 });
  }

  const userId = getAccountId(req);

  // Mock-mode fallback: no DB / embedder configured → accept the request,
  // return a synthetic entry. Lets the demo flow work without Supabase.
  if (!process.env.SUPABASE_DB_URL || !process.env.SILICONFLOW_API_KEY) {
    const id = `${userId}-${Date.now()}`;
    return NextResponse.json({
      id,
      title,
      chunks: chunkMarkdown(markdown).length,
      source: 'mock',
    });
  }

  try {
    const { getDb } = await import('@/lib/db/client');
    const { users, articles, chunks } = await import('@/lib/db/schema');
    const { embed } = await import('@/lib/embeddings');

    const db = getDb();
    await db.insert(users).values({
      id: userId,
      displayName: '访客',
      bio: '本浏览器专属访客身份',
    }).onConflictDoNothing();

    const articleId = `${userId}-upload-${Date.now()}`;
    await db.insert(articles).values({
      id: articleId,
      userId,
      title,
      body: markdown,
      publishedAt: null,
      draft: body.draft ?? false,
      tags: Array.isArray(body.tags) ? body.tags : [],
      borrows: 0,
      spineColor: typeof body.spine === 'string' ? body.spine : null,
      wordCount: markdown.length,
    });

    const chunked = chunkMarkdown(markdown);
    if (chunked.length > 0) {
      const embs = await embed(chunked);
      await db.insert(chunks).values(
        chunked.map((c, i) => ({
          id: `${articleId}-c${i}`,
          articleId,
          userId,
          ord: i,
          content: c,
          embedding: embs[i],
        })),
      );
    }

    return NextResponse.json({
      id: articleId,
      title,
      chunks: chunked.length,
      source: 'live',
    });
  } catch (err) {
    const message = scrubErrorForClient(err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
