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

export type HotListScope = 'relevant' | 'all';
