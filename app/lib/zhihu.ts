import fs from 'node:fs';
import path from 'node:path';
import {
  HotListItem,
  SearchResult,
  ZhidaAnswer,
  FeedPage,
  type HotListScope,
} from './zhihu/types';

// 知乎 API adapter. Mock-mode reads from app/content/zhihu-fixtures/*.json.
// Real-mode lands sprint hour 0 on 5/12 — see plans/2026-05-12-zhihu-api-integration.md.
//
// 5 methods shipped in #13.99: getHotList, searchZhihu, searchGlobal, chatWithZhida,
// getFollowingFeed. The other 7 (圈子 + follow/follower lists + OAuth) live behind
// `// TODO(plan-14)` in plan #14 and intentionally don't exist here.

const FIXTURES_DIR = path.resolve(process.cwd(), 'content/zhihu-fixtures');

const MODE = process.env.ZHIHU_API_MODE ?? 'mock';
const CACHE_MODE = process.env.CACHE_MODE ?? 'auto';

function loadFixture<T>(name: string): T {
  const raw = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf-8');
  return JSON.parse(raw) as T;
}

// realFetch is intentionally a stub. Real-mode HTTP code lands on 5/12 with
// the official docs in hand — guessing endpoint shapes today guarantees rewrite.
async function realFetch(): Promise<unknown> {
  throw new Error(
    'real mode lands on 5/12 — see plans/2026-05-12-zhihu-api-integration.md',
  );
}

// CACHE_MODE precedence: when 'cache-only' (e.g., demo replay), the cache
// layer wins over the fixture. The cache module is lazily imported so the
// adapter doesn't pull cache infrastructure into bundles that don't need it.
async function maybeFromCache<T>(intentText: string): Promise<T | null> {
  if (CACHE_MODE !== 'cache-only') return null;
  try {
    const { lookupCache } = await import('./cache/store');
    const hit = await lookupCache<T>('chat', intentText);
    return hit?.response ?? null;
  } catch {
    return null;
  }
}

export async function getHotList(scope: HotListScope = 'relevant'): Promise<HotListItem[]> {
  const cached = await maybeFromCache<HotListItem[]>(`zhihu-hot-list-${scope}`);
  if (cached) return cached;
  if (MODE === 'mock') {
    const file = scope === 'relevant' ? 'hot-list-relevant.json' : 'hot-list-all.json';
    return loadFixture<HotListItem[]>(file);
  }
  const raw = await realFetch();
  return HotListItem.array().parse(raw);
}

export async function searchZhihu(query: string): Promise<SearchResult[]> {
  const cached = await maybeFromCache<SearchResult[]>(`zhihu-search-${query}`);
  if (cached) return cached;
  if (MODE === 'mock') return loadFixture<SearchResult[]>('search-radiogenomics.json');
  const raw = await realFetch();
  return SearchResult.array().parse(raw);
}

export async function searchGlobal(query: string): Promise<SearchResult[]> {
  const cached = await maybeFromCache<SearchResult[]>(`global-search-${query}`);
  if (cached) return cached;
  if (MODE === 'mock') return loadFixture<SearchResult[]>('search-radiogenomics.json');
  const raw = await realFetch();
  return SearchResult.array().parse(raw);
}

export async function chatWithZhida(prompt: string): Promise<ZhidaAnswer> {
  const cached = await maybeFromCache<ZhidaAnswer>(`zhida-${prompt}`);
  if (cached) return cached;
  if (MODE === 'mock') return loadFixture<ZhidaAnswer>('zhida-radiogenomics.json');
  const raw = await realFetch();
  return ZhidaAnswer.parse(raw);
}

export async function getFollowingFeed(): Promise<FeedPage> {
  const cached = await maybeFromCache<FeedPage>('zhihu-following-feed');
  if (cached) return cached;
  if (MODE === 'mock') return loadFixture<FeedPage>('following-feed.json');
  const raw = await realFetch();
  return FeedPage.parse(raw);
}
