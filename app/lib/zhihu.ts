import {
  HotListItem,
  SearchResult,
  ZhidaAnswer,
  FeedPage,
  Story,
  type HotListScope,
} from './zhihu/types';
import hotListRelevant from '@/content/zhihu-fixtures/hot-list-relevant.json';
import hotListAll from '@/content/zhihu-fixtures/hot-list-all.json';
import searchRadiogenomics from '@/content/zhihu-fixtures/search-radiogenomics.json';
import zhidaRadiogenomics from '@/content/zhihu-fixtures/zhida-radiogenomics.json';
import followingFeed from '@/content/zhihu-fixtures/following-feed.json';
import storyList from '@/content/zhihu-fixtures/story-list.json';

/**
 * Default 圈子 ID for publish/comment/reaction operations.
 * Mentor (A11) confirmed 3 圈子 are available; recommended「黑客松脑洞补给站」.
 * Numeric ID per docs page (NOT the slug `'moltbook'`).
 */
export const DEFAULT_RING_ID = '2029619126742656657';

/** All 3 hackathon-supported 圈子 (per `/community/quickstart` docs page). */
export const SUPPORTED_RING_IDS = [
  { id: '2001009660925334090', name: 'OpenClaw 人类观察员' },
  { id: '2015023739549529606', name: 'A2A for Reconnect' },
  { id: '2029619126742656657', name: '黑客松脑洞补给站' },
] as const;

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

// Real-mode fetch against https://openapi.zhihu.com/* with HMAC signing.
// Auth scheme captured 2026-05-10 from
// https://www.zhihu.com/ring/moltbook/api/community/quickstart.
//
// Server-only: dynamic-imports the sign helper so node:crypto stays out of
// client bundles (same pattern used for the dropped cache/store import).
async function realFetchHmac(path: string, init?: RequestInit): Promise<unknown> {
  const appKey = process.env.ZHIHU_APP_KEY;
  const appSecret = process.env.ZHIHU_APP_SECRET;
  if (!appKey || !appSecret) {
    throw new Error(
      'ZHIHU_APP_KEY + ZHIHU_APP_SECRET required for real mode (set in .env.local). ' +
        'See Documents/zhihu-api/03-api-spec-quickstart-2026-05-10.md.',
    );
  }
  const { signZhihuRequest } = await import('./zhihu/sign');
  const signed = signZhihuRequest(appKey, appSecret);
  const url = new URL(path, 'https://openapi.zhihu.com');
  const incomingHeaders = (init?.headers ?? {}) as Record<string, string>;
  const res = await fetch(url, {
    ...init,
    headers: { ...signed, ...incomingHeaders },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Zhihu ${path} → ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Response unwrapper: 知乎 community APIs return one of three shapes
 *   A. `{status: 0|1, msg, data}`  ← most endpoints
 *   B. `{code:   0|1, msg, data}`  ← comment/create (inconsistency)
 *   C. `data` is top-level (story_list array, /access_token, /user)
 *
 * @internal exported for sign-test only; not part of public API.
 */
export function unwrapZhihu<T>(json: unknown): T {
  if (typeof json !== 'object' || json === null) return json as T;
  const obj = json as Record<string, unknown>;
  if ('data' in obj && ('status' in obj || 'code' in obj)) {
    const status = (obj.status ?? obj.code) as number;
    if (status !== 0) throw new Error(String(obj.msg ?? 'zhihu error'));
    return obj.data as T;
  }
  return json as T;
}

// Data-platform endpoints (热榜 / 搜索 / 直答) live on a SEPARATE host
// (`developer.zhihu.com`) with its own auth scheme — still gated as of 2026-05-10
// (user permission was denied to navigate there). Real-mode wiring waits for
// 5/12 sprint hour 0 + the user signing into developer.zhihu.com.
async function realFetchDataPlatform(): Promise<unknown> {
  throw new Error(
    'data-platform real mode (developer.zhihu.com) gated until 5/12 sprint. ' +
      'See Documents/zhihu-api/04-api-spec-endpoints-2026-05-10.md §数据开放平台.',
  );
}

// OAuth endpoints (`/user*` on openapi.zhihu.com) require Bearer access_token
// from the OAuth flow. Per A9 mentor reply, OAuth is post-MVP; this stub
// exists so getFollowingFeed has a typed call site.
async function realFetchOAuth(): Promise<unknown> {
  throw new Error(
    'OAuth endpoints post-MVP per mentor A9. ' +
      'See plans/2026-05-12-zhihu-api-integration.md Task 6.',
  );
}

export async function getHotList(scope: HotListScope = 'relevant'): Promise<HotListItem[]> {
  if (MODE === 'mock') {
    return scope === 'relevant'
      ? (hotListRelevant as HotListItem[])
      : (hotListAll as HotListItem[]);
  }
  // 热榜 lives on developer.zhihu.com data platform — separate auth, still gated.
  const raw = await realFetchDataPlatform();
  return HotListItem.array().parse(raw);
}

/* eslint-disable @typescript-eslint/no-unused-vars -- query/prompt are part
   of the public adapter contract; mock-mode ignores them (returns fixture)
   and real-mode (5/12+) wires them into the request. */

export async function searchZhihu(query: string): Promise<SearchResult[]> {
  if (MODE === 'mock') return searchRadiogenomics as SearchResult[];
  const raw = await realFetchDataPlatform();
  return SearchResult.array().parse(raw);
}

export async function searchGlobal(query: string): Promise<SearchResult[]> {
  if (MODE === 'mock') return searchRadiogenomics as SearchResult[];
  const raw = await realFetchDataPlatform();
  return SearchResult.array().parse(raw);
}

export async function chatWithZhida(prompt: string): Promise<ZhidaAnswer> {
  if (MODE === 'mock') return zhidaRadiogenomics as ZhidaAnswer;
  const raw = await realFetchDataPlatform();
  return ZhidaAnswer.parse(raw);
}

/* eslint-enable @typescript-eslint/no-unused-vars */

export async function getFollowingFeed(): Promise<FeedPage> {
  if (MODE === 'mock') return followingFeed as FeedPage;
  // 关注流 = OAuth endpoint (Bearer access_token), post-MVP per A9.
  const raw = await realFetchOAuth();
  return FeedPage.parse(raw);
}

/**
 * Hackathon 故事列表 (added 2026-05-10 per A10 + 5/10 docs page).
 * Real-mode endpoint: `GET /openapi/hackathon_story/list` — returns `data` as
 * a top-level array of Story summaries (no `{data: {...}}` wrapper).
 * Mock-mode reads from `content/zhihu-fixtures/story-list.json`.
 *
 * This is the FIRST live-callable real-mode method — set `ZHIHU_APP_KEY` +
 * `ZHIHU_APP_SECRET` in `.env.local` and `ZHIHU_API_MODE=real` to smoke-test.
 */
export async function getStoryList(): Promise<Story[]> {
  if (MODE === 'mock') return storyList as Story[];
  const raw = await realFetchHmac('/openapi/hackathon_story/list');
  return Story.array().parse(unwrapZhihu(raw));
}
