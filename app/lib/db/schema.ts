import { pgTable, text, timestamp, jsonb, integer, vector, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  bio: text('bio'),
  voiceFingerprint: jsonb('voice_fingerprint'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const articles = pgTable('articles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  publishedAt: text('published_at'),
  draft: boolean('draft').default(false).notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  borrows: integer('borrows').default(0).notNull(),
  spineColor: text('spine_color'),
  wordCount: integer('word_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chunks = pgTable('chunks', {
  id: text('id').primaryKey(),
  articleId: text('article_id').notNull().references(() => articles.id),
  userId: text('user_id').notNull().references(() => users.id),
  ord: integer('ord').notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1024 }).notNull(),
});

export const vaultFiles = pgTable('vault_files', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  path: text('path').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});

// Phase #13: pre-seeded responses for the rehearsed live-demo flow.
// Lookup is by cosine similarity on `intent_embedding` ≥ 0.85.
export const demoCache = pgTable('demo_cache', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  intentText: text('intent_text').notNull(),
  intentEmbedding: vector('intent_embedding', { dimensions: 1024 }).notNull(),
  response: jsonb('response').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Phase #13: per-IP rate limit buckets for guest mode.
// `ip_hash` = sha256(remote_ip + user_agent).slice(0, 12). One row per (ip_hash, day_bucket).
// `count_hour` resets when the bucket's hour boundary is crossed (checked at write time).
// `concurrent` is best-effort; decrements on response close, with a 30s fallback timeout.
export const rateLimit = pgTable('rate_limit', {
  ipHash: text('ip_hash').primaryKey(),
  dayBucket: text('day_bucket').notNull(),    // ISO date e.g. "2026-05-04"
  hourBucket: text('hour_bucket').notNull(),  // ISO hour e.g. "2026-05-04T16"
  countDay: integer('count_day').default(0).notNull(),
  countHour: integer('count_hour').default(0).notNull(),
  concurrent: integer('concurrent').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
