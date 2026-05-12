import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as ingestPOST } from '@/app/api/vault/ingest/route';
import { POST as searchPOST } from '@/app/api/vault/search/route';
import { DELETE as deleteArticle } from '@/app/api/vault/articles/[id]/route';
import { GET as exportAll } from '@/app/api/vault/export-all/route';
import { GET as chunksGET } from '@/app/api/vault/articles/[id]/chunks/route';
import meSeed from '@/content/seed/vault-me.json';
import guwanxiSeed from '@/content/seed/vault-guwanxi.json';

// Phase #15.9 Track 5 — cross-account isolation integration test.
//
// Validates the header-based `x-kanshan-account` filter applied by every
// vault endpoint. With Supabase unconfigured in CI, ingest/delete routes use
// the mock-mode no-op return so we can't end-to-end verify "the article is
// still there after a cross-account delete". Instead we lean on the seed
// data path of `search`, `chunks` and `export-all` — these all load from
// the per-account seed JSON, so any header-routing bug surfaces immediately
// as wrong-account data leaking through.

interface SeedRef {
  id: string;
  title: string;
  snippet: string;
  tags: string[];
}

interface SearchResp {
  hits: SeedRef[];
  source: string;
}

interface ExportResp {
  account: string;
  totalArticles: number;
  articles: { id: string; title: string }[];
}

function req(
  url: string,
  method: 'GET' | 'POST' | 'DELETE',
  body?: unknown,
  headers: Record<string, string> = {},
): Request {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  return new Request(url, init);
}

describe('vault cross-account isolation (integration)', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_DB_URL', '');
    vi.stubEnv('SILICONFLOW_API_KEY', '');
  });

  it('Test 1 — search under guwanxi never surfaces me-ingested article id', async () => {
    // Ingest something under me first
    const ingest = await ingestPOST(
      req(
        'http://localhost/api/vault/ingest',
        'POST',
        {
          markdown: '# 川大本科 hackathon\n\n这是 me 账户的私密草稿，长度足够通过分块器。'.repeat(3),
          title: '我的私密稿件',
        },
        { 'x-kanshan-account': 'me', 'x-kanshan-vault-consent': '1' },
      ) as never,
    );
    const ingestData = (await ingest.json()) as { id: string };
    expect(ingestData.id.startsWith('me-')).toBe(true);

    // Search the same term under guwanxi — must NOT see the me article
    const search = await searchPOST(
      req(
        'http://localhost/api/vault/search',
        'POST',
        { query: '我的私密稿件' },
        { 'x-kanshan-account': 'guwanxi' },
      ) as never,
    );
    const data = (await search.json()) as SearchResp;
    expect(data.hits.every((h) => !h.id.startsWith('me-'))).toBe(true);
    expect(data.hits.every((h) => h.title !== '我的私密稿件')).toBe(true);
  });

  it('Test 2 — DELETE under wrong account returns 404 for known me-seed id', async () => {
    // In mock mode the DELETE always returns 200/mock — but the chunks endpoint
    // (also queried with x-kanshan-account) does enforce 404, so we use it as
    // the proxy for "guwanxi cannot see this me-owned article".
    const target = (meSeed as SeedRef[])[0];
    const chunksCrossAcct = await chunksGET(
      req('http://localhost/x', 'GET', undefined, {
        'x-kanshan-account': 'guwanxi',
      }) as never,
      { params: { id: target.id } },
    );
    expect(chunksCrossAcct.status).toBe(404);
  });

  it('Test 3 — me-seed entries remain reachable after a cross-account delete attempt', async () => {
    const target = (meSeed as SeedRef[])[0];
    // Cross-account delete (mock-mode no-op, but verifies route does not throw)
    const del = await deleteArticle(
      req('http://localhost/x', 'DELETE', undefined, {
        'x-kanshan-account': 'guwanxi',
      }) as never,
      { params: Promise.resolve({ id: target.id }) },
    );
    expect([200, 404]).toContain(del.status);

    // me-side search should still see the original article in seed
    const search = await searchPOST(
      req(
        'http://localhost/api/vault/search',
        'POST',
        { query: '' },
        { 'x-kanshan-account': 'me' },
      ) as never,
    );
    const data = (await search.json()) as SearchResp;
    expect(data.hits.some((h) => h.id === target.id)).toBe(true);
  });

  it('Test 4a — export-all under me returns only me articles', async () => {
    const res = await exportAll(
      req('http://localhost/api/vault/export-all', 'GET', undefined, {
        'x-kanshan-account': 'me',
      }) as never,
    );
    const data = (await res.json()) as ExportResp;
    expect(data.account).toBe('me');
    expect(data.totalArticles).toBe((meSeed as SeedRef[]).length);
    expect(data.articles.every((a) => !a.id.startsWith('guwanxi-'))).toBe(true);
  });

  it('Test 4b — export-all under guwanxi returns only guwanxi articles', async () => {
    const res = await exportAll(
      req('http://localhost/api/vault/export-all', 'GET', undefined, {
        'x-kanshan-account': 'guwanxi',
      }) as never,
    );
    const data = (await res.json()) as ExportResp;
    expect(data.account).toBe('guwanxi');
    expect(data.totalArticles).toBe((guwanxiSeed as SeedRef[]).length);
    expect(data.articles.every((a) => !a.id.startsWith('me-'))).toBe(true);
  });

  it('Test 4c — exports disjoint: no id overlap between me and guwanxi dumps', async () => {
    const meRes = await exportAll(
      req('http://localhost/x', 'GET', undefined, { 'x-kanshan-account': 'me' }) as never,
    );
    const gwxRes = await exportAll(
      req('http://localhost/x', 'GET', undefined, {
        'x-kanshan-account': 'guwanxi',
      }) as never,
    );
    const meData = (await meRes.json()) as ExportResp;
    const gwxData = (await gwxRes.json()) as ExportResp;
    const meIds = new Set(meData.articles.map((a) => a.id));
    const overlap = gwxData.articles.filter((a) => meIds.has(a.id));
    expect(overlap.length).toBe(0);
  });
});
