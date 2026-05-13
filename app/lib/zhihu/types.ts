import { z } from 'zod';

// All schemas are loose-typed (most fields optional) until 5/9 docs land and
// we tighten them. Strategy is: existing UI seed JSON shapes are richer than
// what 知乎 API will return at minimum; the loose schema accepts both, and the
// mapper module bridges to the UI types. On 5/12 we tighten + add real-mode
// field-name remapping.

export const HotListItem = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  // API-shape (will be present in real mode):
  heat: z.union([z.string(), z.number()]).optional(),
  excerpt: z.string().optional(),
  answerCount: z.number().optional(),
  url: z.string().optional(),
  // UI-shape (present in mock fixtures derived from existing seed JSON):
  rank: z.number().optional(),
  ageHours: z.number().optional(),
  ageLabel: z.string().optional(),
  tags: z.array(z.string()).optional(),
  hot: z.boolean().optional(),
  vibes: z.string().optional(),
  vibesFox: z.enum(['shi', 'jing']).nullable().optional(),
});
export type HotListItem = z.infer<typeof HotListItem>;

export const SearchResult = z.object({
  id: z.string(),
  type: z.enum(['answer', 'article', 'question']),
  title: z.string(),
  abstract: z.string().optional(),
  author: z
    .object({
      id: z.string(),
      displayName: z.string(),
      bio: z.string().optional(),
    })
    .optional(),
  publishedAt: z.string().optional(),
  relevanceScore: z.number().optional(),
  authorityScore: z.number().optional(),
  voteUp: z.number().optional(),
  commentCount: z.number().optional(),
  featuredComment: z.string().optional(),
  url: z.string().optional(),
});
export type SearchResult = z.infer<typeof SearchResult>;

export const ZhidaAnswer = z.object({
  text: z.string(),
  citations: z.array(
    z.object({
      answererId: z.string().optional(),
      answererName: z.string().optional(),
      url: z.string().optional(),
      snippet: z.string().optional(),
    }),
  ),
});
export type ZhidaAnswer = z.infer<typeof ZhidaAnswer>;

export const FeedItem = z.object({
  id: z.string(),
  type: z.enum(['answer', 'article', 'pin', 'question']),
  title: z.string().optional(),
  excerpt: z.string().optional(),
  authorId: z.string(),
  authorName: z.string(),
  createdAt: z.string(),
  url: z.string().optional(),
});
export type FeedItem = z.infer<typeof FeedItem>;

export const FeedPage = z.object({
  items: z.array(FeedItem),
  cursor: z.string().nullable(),
});
export type FeedPage = z.infer<typeof FeedPage>;

// Hackathon story-list / story-detail (added 2026-05-10 per A10 + docs page).
// `GET /openapi/hackathon_story/list` returns `data` as a top-level array of
// these summaries (NOT wrapped in {data: {...}}). The adapter unwraps before
// passing to Zod.
export const Story = z.object({
  // Some 知乎 endpoints return numeric IDs even for fields documented as string —
  // coerce defensively (matches PinPublishResponse.created_at pattern).
  work_id: z.union([z.string(), z.number()]).transform(String),
  title: z.string(),
  artwork: z.string().optional(),     // landscape cover URL
  tab_artwork: z.string().optional(), // portrait cover URL
  description: z.string().optional(),
  labels: z.array(z.string()).optional(),
});
export type Story = z.infer<typeof Story>;

// `GET /openapi/hackathon_story/detail?work_id={id}` returns a single chapter.
export const StoryDetail = z.object({
  work_id: z.string(),
  chapter_name: z.string(),
  author_avatar: z.string().optional(),
  author_name: z.string(),
  labels: z.array(z.string()).optional(),
  introduction: z.string().optional(),
  content: z.string(), // ≤3000 chars per docs, paragraphs preserved with \n
});
export type StoryDetail = z.infer<typeof StoryDetail>;

export type HotListScope = 'relevant' | 'all';

export const PinPublishRequest = z.object({
  content: z.string().min(1).max(2000),
  ring_id: z.string(),
});
export type PinPublishRequest = z.infer<typeof PinPublishRequest>;

// 知乎's /openapi/publish/pin actually returns `{content_token}` (verified
// 2026-05-13 live audit), not `pin_id`. The mock fixture still uses pin_id
// for back-compat with code that consumes the field. Accept either; the
// caller can read whichever one comes back. Both optional so an empty data
// envelope (status:0 with no body) doesn't 502 us — the operation succeeded
// on the server side, we just don't have an id to surface.
export const PinPublishResponse = z.object({
  pin_id: z.string().optional(),
  content_token: z.string().optional(),
  created_at: z.union([z.string(), z.number()]).optional(),
});
export type PinPublishResponse = z.infer<typeof PinPublishResponse>;
