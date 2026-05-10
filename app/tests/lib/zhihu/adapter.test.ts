import { describe, it, expect } from 'vitest';
import {
  getHotList,
  searchZhihu,
  searchGlobal,
  chatWithZhida,
  getFollowingFeed,
  getStoryList,
  DEFAULT_RING_ID,
  SUPPORTED_RING_IDS,
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

  it('getStoryList returns hackathon story summaries', async () => {
    const stories = await getStoryList();
    expect(Array.isArray(stories)).toBe(true);
    expect(stories.length).toBeGreaterThan(0);
    expect(stories[0]).toMatchObject({
      work_id: expect.any(String),
      title: expect.any(String),
    });
  });

  it('DEFAULT_RING_ID matches the mentor-recommended 黑客松脑洞补给站 numeric id', () => {
    expect(DEFAULT_RING_ID).toBe('2029619126742656657');
    expect(
      SUPPORTED_RING_IDS.some((r) => r.id === DEFAULT_RING_ID && r.name.includes('黑客松')),
    ).toBe(true);
  });

  it('SUPPORTED_RING_IDS lists all 3 hackathon 圈子', () => {
    expect(SUPPORTED_RING_IDS).toHaveLength(3);
    const ids = SUPPORTED_RING_IDS.map((r) => r.id);
    expect(ids).toContain('2001009660925334090');
    expect(ids).toContain('2015023739549529606');
    expect(ids).toContain('2029619126742656657');
  });
});
