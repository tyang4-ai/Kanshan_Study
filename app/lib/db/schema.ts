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
