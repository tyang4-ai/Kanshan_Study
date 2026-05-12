import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DELETE } from '@/app/api/vault/articles/[id]/route';

function makeReq(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/vault/articles/some-id', {
    method: 'DELETE',
    headers,
  });
}

describe('DELETE /api/vault/articles/[id]', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_DB_URL', '');
    vi.stubEnv('SILICONFLOW_API_KEY', '');
  });

  it('returns deleted=true in mock mode (no DB configured)', async () => {
    const req = makeReq();
    const res = await DELETE(req as never, { params: Promise.resolve({ id: 'guwanxi-01-imaging-genomics-turn' }) });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { deleted: boolean; source: string };
    expect(data.deleted).toBe(true);
    expect(data.source).toBe('mock');
  });

  it('returns 400 when id is empty', async () => {
    const req = makeReq();
    const res = await DELETE(req as never, { params: Promise.resolve({ id: '   ' }) });
    expect(res.status).toBe(400);
  });

  it('mock mode also accepts unknown ids (idempotent UX)', async () => {
    const req = makeReq();
    const res = await DELETE(req as never, { params: Promise.resolve({ id: 'not-a-real-id' }) });
    // In mock mode we don't validate ownership; the client is trusted to only
    // attempt deletes on entries it can see. Live mode does the 404 check.
    expect(res.status).toBe(200);
  });

  it('respects x-kanshan-account header (mock mode just echoes deleted=true)', async () => {
    const req = makeReq({ 'x-kanshan-account': 'guwanxi' });
    const res = await DELETE(req as never, { params: Promise.resolve({ id: 'guwanxi-99' }) });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { deleted: boolean };
    expect(data.deleted).toBe(true);
  });

  describe('live mode (DB configured)', () => {
    beforeEach(() => {
      vi.stubEnv('SUPABASE_DB_URL', 'postgres://stub');
      vi.stubEnv('SILICONFLOW_API_KEY', 'stub-key');
      vi.resetModules();
    });

    it('returns 404 when article not owned by user', async () => {
      vi.doMock('@/lib/db/client', () => ({
        getDb: () => ({
          select: () => ({
            from: () => ({
              where: () => Promise.resolve([]),
            }),
          }),
          // unused
          transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
        }),
      }));
      const { DELETE: D } = await import('@/app/api/vault/articles/[id]/route');
      const req = new Request('http://localhost/api/vault/articles/x', {
        method: 'DELETE',
        headers: { 'x-kanshan-account': 'me' },
      });
      const res = await D(req as never, { params: Promise.resolve({ id: 'someone-elses-article' }) });
      expect(res.status).toBe(404);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('article not found');
    });

    it('returns deleted=true and runs transaction when article is owned', async () => {
      const deletedTables: string[] = [];
      vi.doMock('@/lib/db/client', () => ({
        getDb: () => ({
          select: () => ({
            from: () => ({
              where: () => Promise.resolve([{ id: 'owned-article' }]),
            }),
          }),
          transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
            const tx = {
              delete: (table: { _name?: string }) => ({
                where: () => {
                  deletedTables.push(table._name ?? 'unknown');
                  return Promise.resolve();
                },
              }),
            };
            return fn(tx);
          },
        }),
      }));
      vi.doMock('@/lib/db/schema', () => ({
        articles: { _name: 'articles', id: 'id', userId: 'user_id' },
        chunks: { _name: 'chunks', id: 'id', articleId: 'article_id', userId: 'user_id' },
      }));
      vi.doMock('drizzle-orm', () => ({
        and: () => null,
        eq: () => null,
      }));
      const { DELETE: D } = await import('@/app/api/vault/articles/[id]/route');
      const req = new Request('http://localhost/api/vault/articles/owned-article', {
        method: 'DELETE',
        headers: { 'x-kanshan-account': 'me' },
      });
      const res = await D(req as never, { params: Promise.resolve({ id: 'owned-article' }) });
      expect(res.status).toBe(200);
      const data = (await res.json()) as { deleted: boolean; source: string };
      expect(data.deleted).toBe(true);
      expect(data.source).toBe('live');
      // both tables should have been targeted (chunks first, then articles)
      expect(deletedTables).toEqual(['chunks', 'articles']);
    });
  });
});
