import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/vault/export-all/route';
import guwanxiSeed from '@/content/seed/vault-guwanxi.json';
import meSeed from '@/content/seed/vault-me.json';

interface SeedEntry {
  id: string;
  title: string;
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
  account: 'me' | 'guwanxi';
  totalArticles: number;
  totalChunks: number;
  articles: ExportArticle[];
  inMemoryFallback?: boolean;
  error?: string;
}

function makeReq(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/vault/export-all', {
    method: 'GET',
    headers,
  });
}

describe('GET /api/vault/export-all', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_DB_URL', '');
  });

  it('returns JSON with article list for me account (in-memory fallback)', async () => {
    const req = makeReq({ 'x-kanshan-account': 'me' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const data = (await res.json()) as ExportResponse;
    expect(data.account).toBe('me');
    expect(data.inMemoryFallback).toBe(true);
    expect(data.totalArticles).toBe((meSeed as SeedEntry[]).length);
    expect(data.articles.length).toBe((meSeed as SeedEntry[]).length);
    expect(typeof data.exportedAt).toBe('string');
  });

  it('returns JSON with guwanxi seed articles when header is guwanxi', async () => {
    const req = makeReq({ 'x-kanshan-account': 'guwanxi' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const data = (await res.json()) as ExportResponse;
    expect(data.account).toBe('guwanxi');
    expect(data.totalArticles).toBe((guwanxiSeed as SeedEntry[]).length);
    const titles = data.articles.map((a) => a.title);
    const seedTitles = (guwanxiSeed as SeedEntry[]).map((s) => s.title);
    for (const t of seedTitles) {
      expect(titles).toContain(t);
    }
  });

  it('returns 400 for invalid x-kanshan-account header', async () => {
    const req = makeReq({ 'x-kanshan-account': 'attacker' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await GET(req as any);
    expect(res.status).toBe(400);
    const data = (await res.json()) as ExportResponse;
    expect(data.error).toBeDefined();
  });

  it('defaults to me when header missing', async () => {
    const req = makeReq();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const data = (await res.json()) as ExportResponse;
    expect(data.account).toBe('me');
  });
});
