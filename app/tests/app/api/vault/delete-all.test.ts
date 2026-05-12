import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DELETE } from '@/app/api/vault/all/route';

interface DeleteResponse {
  deleted: boolean;
  articleCount: number;
  chunkCount: number;
  note?: string;
  error?: string;
}

function makeReq(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/vault/all', {
    method: 'DELETE',
    headers,
  });
}

describe('DELETE /api/vault/all', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_DB_URL', '');
  });

  it('returns deleted=true with counts in mock mode (me)', async () => {
    const req = makeReq({ 'x-kanshan-account': 'me' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await DELETE(req as any);
    expect(res.status).toBe(200);
    const data = (await res.json()) as DeleteResponse;
    expect(data.deleted).toBe(true);
    expect(typeof data.articleCount).toBe('number');
    expect(typeof data.chunkCount).toBe('number');
    expect(data.note).toContain('no DB configured');
  });

  it('returns deleted=true for guwanxi without touching me data (cross-account isolation, mock mode)', async () => {
    const reqA = makeReq({ 'x-kanshan-account': 'guwanxi' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resA = await DELETE(reqA as any);
    const dataA = (await resA.json()) as DeleteResponse;
    expect(dataA.deleted).toBe(true);

    // Now confirm me's export is still intact (cross-account isolation proxy in mock mode).
    const { GET } = await import('@/app/api/vault/export-all/route');
    const exportReq = new Request('http://localhost/api/vault/export-all', {
      method: 'GET',
      headers: { 'x-kanshan-account': 'me' },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exportRes = await GET(exportReq as any);
    const exportData = (await exportRes.json()) as { totalArticles: number };
    expect(exportData.totalArticles).toBeGreaterThan(0);
  });

  it('returns 400 for invalid x-kanshan-account header', async () => {
    const req = makeReq({ 'x-kanshan-account': 'admin' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await DELETE(req as any);
    expect(res.status).toBe(400);
    const data = (await res.json()) as DeleteResponse;
    expect(data.error).toBeDefined();
  });
});
