import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { embed } from '@/lib/embeddings';
import { rerank } from '@/lib/rerank';

export interface VaultHit {
  chunkId: string;
  articleId: string;
  title: string;
  date: string;
  year: string;
  content: string;
  spineColor: string | null;
  borrows: number;
  tags: string[];
  score: number;
}

interface ChunkRow {
  chunk_id: string;
  article_id: string;
  title: string;
  date: string | null;
  spine_color: string | null;
  borrows: number;
  tags: string[];
  content: string;
  cos_sim: number;
}

export async function searchVault(userId: string, query: string, topK = 7): Promise<VaultHit[]> {
  const [emb] = await embed([query]);
  const db = getDb();
  const result = await db.execute(sql`
    select c.id as chunk_id, c.article_id, a.title, a.published_at as date,
           a.spine_color, a.borrows, a.tags, c.content,
           1 - (c.embedding <=> ${JSON.stringify(emb)}::vector) as cos_sim
    from chunks c
    join articles a on a.id = c.article_id
    where c.user_id = ${userId}
    order by c.embedding <=> ${JSON.stringify(emb)}::vector
    limit ${topK * 3}
  `);
  const candidates = result as unknown as ChunkRow[];
  if (candidates.length === 0) return [];
  const docs = candidates.map((r) => r.content);
  const ranked = await rerank(query, docs, topK);
  return ranked.map((r) => {
    const c = candidates[r.index];
    const date = c.date ?? '';
    const year = date ? date.slice(0, 4) : '';
    return {
      chunkId: c.chunk_id,
      articleId: c.article_id,
      title: c.title,
      date,
      year,
      content: c.content,
      spineColor: c.spine_color,
      borrows: c.borrows,
      tags: c.tags,
      score: r.score,
    };
  });
}
