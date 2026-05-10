import {
  HotListItem,
  SearchResult,
  ZhidaAnswer,
  FeedPage,
  type HotListScope,
} from './zhihu/types';
import hotListRelevant from '@/content/zhihu-fixtures/hot-list-relevant.json';
import hotListAll from '@/content/zhihu-fixtures/hot-list-all.json';
import searchRadiogenomics from '@/content/zhihu-fixtures/search-radiogenomics.json';
import zhidaRadiogenomics from '@/content/zhihu-fixtures/zhida-radiogenomics.json';
import followingFeed from '@/content/zhihu-fixtures/following-feed.json';

// 知乎 API adapter. Mock-mode resolves from statically-imported fixture JSON
// so the module is browser-safe (no node:fs, no postgres). Real-mode lands
// sprint hour 0 on 5/12 — see plans/2026-05-12-zhihu-api-integration.md.
//
// CACHE_MODE precedence (cache-only demo replay) is handled at the API-route
// layer, NOT here — keeping the adapter dependency-free of the cache module
// keeps it client-bundleable.
//
// 5 methods shipped in #13.99: getHotList, searchZhihu, searchGlobal,
// chatWithZhida, getFollowingFeed. The other 7 (圈子 + follow/follower lists +
// OAuth) live behind `// TODO(plan-14)` and intentionally don't exist here.

const MODE = process.env.ZHIHU_API_MODE ?? 'mock';

// realFetch is intentionally a stub. Real-mode HTTP code lands on 5/12 with
// the official docs in hand — guessing endpoint shapes today guarantees rewrite.
async function realFetch(): Promise<unknown> {
  throw new Error(
    'real mode lands on 5/12 — see plans/2026-05-12-zhihu-api-integration.md',
  );
}

export async function getHotList(scope: HotListScope = 'relevant'): Promise<HotListItem[]> {
  if (MODE === 'mock') {
    return scope === 'relevant'
      ? (hotListRelevant as HotListItem[])
      : (hotListAll as HotListItem[]);
  }
  const raw = await realFetch();
  return HotListItem.array().parse(raw);
}

/* eslint-disable @typescript-eslint/no-unused-vars -- query/prompt are part
   of the public adapter contract; mock-mode ignores them (returns fixture)
   and real-mode (5/12+) wires them into the request. */

export async function searchZhihu(query: string): Promise<SearchResult[]> {
  if (MODE === 'mock') return searchRadiogenomics as SearchResult[];
  const raw = await realFetch();
  return SearchResult.array().parse(raw);
}

export async function searchGlobal(query: string): Promise<SearchResult[]> {
  if (MODE === 'mock') return searchRadiogenomics as SearchResult[];
  const raw = await realFetch();
  return SearchResult.array().parse(raw);
}

export async function chatWithZhida(prompt: string): Promise<ZhidaAnswer> {
  if (MODE === 'mock') return zhidaRadiogenomics as ZhidaAnswer;
  const raw = await realFetch();
  return ZhidaAnswer.parse(raw);
}

/* eslint-enable @typescript-eslint/no-unused-vars */

export async function getFollowingFeed(): Promise<FeedPage> {
  if (MODE === 'mock') return followingFeed as FeedPage;
  const raw = await realFetch();
  return FeedPage.parse(raw);
}
