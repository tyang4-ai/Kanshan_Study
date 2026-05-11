import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/vault/search/route';
import guwanxiSeed from '@/content/seed/vault-guwanxi.json';
import meSeed from '@/content/seed/vault-me.json';

interface SeedEntry {
  id: string;
  title: string;
  snippet: string;
  year: string;
  date: string;
  words: number;
  borrows: number;
  draft?: boolean;
  tags: string[];
  spine?: string;
}

interface SearchResponse {
  hits: SeedEntry[];
  source: 'seed' | 'seed-fallback' | 'live';
  error?: string;
}

function makeReq(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/vault/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/vault/search', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_DB_URL', '');
    vi.stubEnv('SILICONFLOW_API_KEY', '');
  });

  it('returns seed-source guwanxi entries matching query when env unset', async () => {
    const req = makeReq({ query: '影像' }, { 'x-kanshan-account': 'guwanxi' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);
    const data = (await res.json()) as SearchResponse;
    expect(data.source).toBe('seed');
    expect(data.hits.length).toBeGreaterThan(0);
    expect(
      data.hits.every(
        (h) =>
          h.title.includes('影像') ||
          h.snippet.includes('影像') ||
          h.tags.some((t) => t.includes('影像'))
      )
    ).toBe(true);
  });

  it('empty query returns all entries for the account', async () => {
    const req = makeReq({ query: '' }, { 'x-kanshan-account': 'guwanxi' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);
    const data = (await res.json()) as SearchResponse;
    expect(data.hits.length).toBe((guwanxiSeed as SeedEntry[]).length);
  });

  it('header x-kanshan-account: guwanxi returns guwanxi entries', async () => {
    const req = makeReq({}, { 'x-kanshan-account': 'guwanxi' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);
    const data = (await res.json()) as SearchResponse;
    expect(data.hits.length).toBe((guwanxiSeed as SeedEntry[]).length);
  });

  it('missing header returns me entries (5 鲁迅-voice articles per Round-2 fix)', async () => {
    const req = makeReq({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);
    const data = (await res.json()) as SearchResponse;
    expect(data.hits.length).toBe((meSeed as SeedEntry[]).length);
    expect(data.hits.length).toBeGreaterThan(0);
  });

  it('malformed body returns 400', async () => {
    const req = new Request('http://localhost/api/vault/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const data = (await res.json()) as SearchResponse;
    expect(data.error).toBe('invalid JSON');
  });
});
