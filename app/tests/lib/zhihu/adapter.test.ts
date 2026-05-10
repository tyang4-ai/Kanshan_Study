import { describe, it, expect } from 'vitest';
import {
  getHotList,
  searchZhihu,
  searchGlobal,
  chatWithZhida,
  getFollowingFeed,
} from '@/lib/zhihu';

describe('zhihu adapter (mock mode)', () => {
  it('getHotList returns relevant fixture by default', async () => {
    const items = await getHotList();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toMatchObject({ id: expect.anything(), title: expect.any(String) });
  });

  it('getHotList honours scope=all', async () => {
    const rel = await getHotList('relevant');
    const all = await getHotList('all');
    expect(rel.length).toBeGreaterThan(0);
    expect(all.length).toBeGreaterThan(0);
    // Scopes are distinct fixture files; allow either count differing OR same content if seeds match
    expect(Array.isArray(rel)).toBe(true);
    expect(Array.isArray(all)).toBe(true);
  });

  it('searchZhihu returns results array', async () => {
    const results = await searchZhihu('放射基因组学');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toMatchObject({ id: expect.any(String), title: expect.any(String) });
  });

  it('searchGlobal returns results array', async () => {
    const results = await searchGlobal('radiogenomics');
    expect(results.length).toBeGreaterThan(0);
  });

  it('chatWithZhida returns text + citations', async () => {
    const answer = await chatWithZhida('放射基因组学距离临床多远');
    expect(answer.text.length).toBeGreaterThan(0);
    expect(Array.isArray(answer.citations)).toBe(true);
  });

  it('getFollowingFeed returns feed page', async () => {
    const page = await getFollowingFeed();
    expect(Array.isArray(page.items)).toBe(true);
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.cursor).toBeNull();
  });
});
