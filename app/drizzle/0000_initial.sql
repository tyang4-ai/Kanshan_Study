-- Hand-written initial migration. Includes pgvector extension + ivfflat index.
-- Run via: pnpm dlx drizzle-kit migrate (after SUPABASE_DB_URL is set)

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "display_name" text NOT NULL,
  "bio" text,
  "voice_fingerprint" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "articles" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "title" text NOT NULL,
  "body" text NOT NULL,
  "published_at" text,
  "draft" boolean DEFAULT false NOT NULL,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "borrows" integer DEFAULT 0 NOT NULL,
  "spine_color" text,
  "word_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "chunks" (
  "id" text PRIMARY KEY NOT NULL,
  "article_id" text NOT NULL REFERENCES "articles"("id"),
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "ord" integer NOT NULL,
  "content" text NOT NULL,
  "embedding" vector(1024) NOT NULL
);

CREATE TABLE IF NOT EXISTS "vault_files" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "path" text NOT NULL,
  "uploaded_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS chunks_article_id_idx ON chunks (article_id);
CREATE INDEX IF NOT EXISTS articles_user_id_idx ON articles (user_id);
