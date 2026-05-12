import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/vault/articles/[id]/chunks/route';
import guwanxiSeed from '@/content/seed/vault-guwanxi.json';
import meSeed from '@/content/seed/vault-me.json';

interface SeedEntry {
  id: string;
  title: string;
}

interface ChunksResponse {
  articleId?: string;
  chunks?: { id: string; text: string; charCount: number; position: number }[];
  inMemoryFallback?: boolean;
  error?: string;
}

function makeReq(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/vault/articles/x/chunks', {
    method: 'GET',
    headers,
  });
}

describe('GET /api/vault/articles/[id]/chunks', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_DB_URL', '');
    vi.stubEnv('SILICONFLOW_API_KEY', '');
  });

  it('returns chunks payload for a valid me-owned seed article', async () => {
    const target = (meSeed as SeedEntry[])[0];
    const req = makeReq({ 'x-kanshan-account': 'me' });
    const res = await GET(req as never, { params: { id: target.id } });
    expect(res.status).toBe(200);
    const data = (await res.json()) as ChunksResponse;
    expect(data.articleId).toBe(target.id);
    expect(Array.isArray(data.chunks)).toBe(true);
    // seed JSON has no body/chunks → empty list with fallback flag
    expect(data.inMemoryFallback).toBe(true);
  });

  it('returns 404 when requesting a guwanxi article id under me account', async () => {
    const guwanxiTarget = (guwanxiSeed as SeedEntry[])[0];
    const req = makeReq({ 'x-kanshan-account': 'me' });
    const res = await GET(req as never, { params: { id: guwanxiTarget.id } });
    expect(res.status).toBe(404);
    const data = (await res.json()) as ChunksResponse;
    expect(data.error).toBe('article not found');
  });

  it('returns 404 for an unknown id', async () => {
    const req = makeReq({ 'x-kanshan-account': 'me' });
    const res = await GET(req as never, { params: { id: 'does-not-exist-xyz' } });
    expect(res.status).toBe(404);
  });

  it('returns 404 when accessing a me-only id from guwanxi account', async () => {
    const target = (meSeed as SeedEntry[])[0];
    const req = makeReq({ 'x-kanshan-account': 'guwanxi' });
    const res = await GET(req as never, { params: { id: target.id } });
    expect(res.status).toBe(404);
  });

  it('falls through to seed lookup when DB import explodes', async () => {
    vi.stubEnv('SUPABASE_DB_URL', 'postgres://nope');
    vi.stubEnv('SILICONFLOW_API_KEY', 'sk-nope');
    const target = (meSeed as SeedEntry[])[0];
    const req = makeReq({ 'x-kanshan-account': 'me' });
    const res = await GET(req as never, { params: { id: target.id } });
    expect(res.status).toBe(200);
    const data = (await res.json()) as ChunksResponse;
    expect(data.articleId).toBe(target.id);
    expect(data.inMemoryFallback).toBe(true);
  });
});
