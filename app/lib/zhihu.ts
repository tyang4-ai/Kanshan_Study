import {
  HotListItem,
  SearchResult,
  ZhidaAnswer,
  FeedPage,
  Story,
  PinPublishResponse,
  type HotListScope,
} from './zhihu/types';
import hotListRelevant from '@/content/zhihu-fixtures/hot-list-relevant.json';
import hotListAll from '@/content/zhihu-fixtures/hot-list-all.json';
import searchRadiogenomics from '@/content/zhihu-fixtures/search-radiogenomics.json';
import zhidaRadiogenomics from '@/content/zhihu-fixtures/zhida-radiogenomics.json';
import followingFeed from '@/content/zhihu-fixtures/following-feed.json';
import storyList from '@/content/zhihu-fixtures/story-list.json';
import pinPublishResponse from '@/content/zhihu-fixtures/pin-publish-response.json';
import type { ZhihuBudgetKind } from './zhihu/budget';

// Budget consume — only meaningful client-side (the Zustand store persists to
// localStorage and is rendered by the TitleBar BudgetChip). Server-side calls
// silently no-op since the store's SSR storage stub doesn't persist.
function noteConsume(kind: ZhihuBudgetKind, n = 1): void {
  if (typeof window === 'undefined') return;
  // Lazy import keeps the client store off the server bundle hot path.
  // Best-effort: if the store fails to load (HMR boundary, SSR edge), silently
  // skip — the chip is informational, not load-bearing.
  import('./zhihu/budget')
    .then(({ useZhihuBudgetStore }) => {
      useZhihuBudgetStore.getState().consume(kind, n);
    })
    .catch(() => {
      /* no-op */
    });
}

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
  // CDN may return 200 with HTML error page — guard res.json() to throw a
  // readable error instead of bare SyntaxError that crashes route handlers.
  try {
    return await res.json();
  } catch {
    const body = await res.text().catch(() => '');
    throw new Error(`Zhihu ${path} → invalid JSON body: ${body.slice(0, 100)}`);
  }
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

// Data-platform endpoints (热榜 / 搜索 / 直答) live on `developer.zhihu.com`
// with Bearer-AccessKey auth (verified 2026-05-10 at developer.zhihu.com/profile).
// Spec: Documents/zhihu-api/05-api-spec-developer-platform-2026-05-10.md.
//
// Headers: Authorization: Bearer $ZHIHU_ACCESS_SECRET + X-Request-Timestamp.
// Response shape: { Code: 0, Message: "success", Data: {...} } — non-zero Code
// throws (Message becomes the error string).
async function realFetchDataPlatform(
  path: string,
  init?: RequestInit & { query?: Record<string, string | number> },
): Promise<unknown> {
  const accessSecret = process.env.ZHIHU_ACCESS_SECRET;
  if (!accessSecret) {
    throw new Error(
      'ZHIHU_ACCESS_SECRET required for real mode (set in .env.local). ' +
        'See Documents/zhihu-api/05-api-spec-developer-platform-2026-05-10.md.',
    );
  }
  const url = new URL(path, 'https://developer.zhihu.com');
  if (init?.query) {
    for (const [k, v] of Object.entries(init.query)) {
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessSecret}`,
      'X-Request-Timestamp': String(Math.floor(Date.now() / 1000)),
      'Content-Type': 'application/json',
      ...((init?.headers ?? {}) as Record<string, string>),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Zhihu ${path} → ${res.status} ${body.slice(0, 200)}`);
  }
  let json: Record<string, unknown>;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    const body = await res.text().catch(() => '');
    throw new Error(`Zhihu ${path} → invalid JSON body: ${body.slice(0, 100)}`);
  }
  // /api/v1/content/* endpoints wrap in {Code, Message, Data}.
  // /v1/chat/completions returns OpenAI shape at top level (no Code field).
  if (json && typeof json === 'object' && 'Code' in json) {
    if (json.Code !== 0) {
      throw new Error(`Zhihu ${path} Code=${json.Code as number} ${(json.Message as string) ?? ''}`);
    }
    return json.Data;
  }
  return json;
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

// Response shape from developer.zhihu.com (PascalCase). Internal types use
// camelCase. Mappers below normalize so the rest of the app stays unchanged
// when MODE flips from mock → real.

interface DpHotItem {
  Title: string;
  Url: string;
  ThumbnailUrl?: string;
  Summary?: string;
}

interface DpSearchItem {
  Title: string;
  ContentType: 'Article' | 'Answer' | 'Question';
  ContentID: string;
  ContentText?: string;
  Url?: string;
  CommentCount?: number;
  VoteUpCount?: number;
  AuthorName?: string;
  AuthorAvatar?: string;
  AuthorBadge?: string;
  AuthorBadgeText?: string;
  EditTime?: number;
  CommentInfoList?: Array<{ Content?: string }>;
  AuthorityLevel?: string;
  RankingScore?: number;
}

/** @internal exported for tests only — do not consume from app code. */
export const __test = {
  mapDpHotItem: (it: DpHotItem, idx: number) => mapDpHotItem(it, idx),
  mapDpSearchItem: (it: DpSearchItem) => mapDpSearchItem(it),
};

function mapDpHotItem(it: DpHotItem, idx: number): HotListItem {
  return {
    id: it.Url || `hot-${idx}`,
    title: it.Title,
    rank: idx + 1,
    excerpt: it.Summary || undefined,
    url: it.Url || undefined,
  };
}

function mapDpSearchItem(it: DpSearchItem): SearchResult {
  const typeMap = { Article: 'article', Answer: 'answer', Question: 'question' } as const;
  return {
    id: it.ContentID,
    type: typeMap[it.ContentType],
    title: it.Title,
    abstract: it.ContentText || undefined,
    author: it.AuthorName
      ? { id: it.AuthorName, displayName: it.AuthorName }
      : undefined,
    publishedAt: it.EditTime ? new Date(it.EditTime * 1000).toISOString() : undefined,
    relevanceScore: it.RankingScore,
    authorityScore: it.AuthorityLevel ? Number(it.AuthorityLevel) : undefined,
    voteUp: it.VoteUpCount,
    commentCount: it.CommentCount,
    featuredComment: it.CommentInfoList?.[0]?.Content,
    url: it.Url,
  };
}

export async function getHotList(scope: HotListScope = 'relevant'): Promise<HotListItem[]> {
  if (MODE === 'mock') {
    return scope === 'relevant'
      ? (hotListRelevant as HotListItem[])
      : (hotListAll as HotListItem[]);
  }
  // 热榜 = developer.zhihu.com Bearer endpoint. `scope` is API-side-uniform
  // (no relevant-vs-all filter on the live API yet) — the relevant filter is
  // a downstream concern (LLM tag-match on Title), not surfaced here.
  const raw = (await realFetchDataPlatform('/api/v1/content/hot_list', {
    method: 'GET',
    query: { Limit: 30 },
  })) as { Total: number; Items: DpHotItem[] };
  noteConsume('hot_list');
  return HotListItem.array().parse(raw.Items.map(mapDpHotItem));
}

export async function searchZhihu(query: string): Promise<SearchResult[]> {
  if (MODE === 'mock') return searchRadiogenomics as SearchResult[];
  const raw = (await realFetchDataPlatform('/api/v1/content/zhihu_search', {
    method: 'GET',
    query: { Query: query, Count: 10 },
  })) as { Items: DpSearchItem[] };
  noteConsume('zhihu_search');
  return SearchResult.array().parse(raw.Items.map(mapDpSearchItem));
}

export async function searchGlobal(query: string): Promise<SearchResult[]> {
  if (MODE === 'mock') return searchRadiogenomics as SearchResult[];
  const raw = (await realFetchDataPlatform('/api/v1/content/global_search', {
    method: 'GET',
    query: { Query: query, Count: 20 },
  })) as { Items: DpSearchItem[] };
  noteConsume('zhihu_search');
  return SearchResult.array().parse(raw.Items.map(mapDpSearchItem));
}

export async function chatWithZhida(prompt: string): Promise<ZhidaAnswer> {
  if (MODE === 'mock') return zhidaRadiogenomics as ZhidaAnswer;
  // Default tier: `zhida-fast-1p5` (cheapest) — A3 「无所谓」, budget tracker only.
  // Swap to `zhida-thinking-1p5` if reasoning_content surfacing is wanted later.
  // /v1/chat/completions returns OpenAI shape directly — no {Code, Data} wrap.
  const resp = (await realFetchDataPlatform('/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: 'zhida-fast-1p5',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
  })) as {
    choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
  };
  noteConsume('zhida');
  const text = resp.choices?.[0]?.message?.content ?? '';
  return ZhidaAnswer.parse({ text, citations: [] });
}

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

export async function publishPin(
  content: string,
  ringId: string = DEFAULT_RING_ID,
): Promise<PinPublishResponse> {
  if (MODE === 'mock') return pinPublishResponse as PinPublishResponse;
  const raw = await realFetchHmac('/openapi/pin/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, ring_id: ringId }),
  });
  return PinPublishResponse.parse(unwrapZhihu(raw));
}
