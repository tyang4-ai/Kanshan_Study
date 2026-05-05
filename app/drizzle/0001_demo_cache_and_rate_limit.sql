-- Phase #13: pre-seeded LLM cache + per-IP guest rate-limit buckets.

CREATE TABLE IF NOT EXISTS "demo_cache" (
  "id" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "intent_text" text NOT NULL,
  "intent_embedding" vector(1024) NOT NULL,
  "response" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS demo_cache_embedding_idx
  ON demo_cache USING ivfflat (intent_embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS demo_cache_kind_idx ON demo_cache (kind);
CREATE UNIQUE INDEX IF NOT EXISTS demo_cache_kind_intent_idx
  ON demo_cache (kind, intent_text);

CREATE TABLE IF NOT EXISTS "rate_limit" (
  "ip_hash" text PRIMARY KEY NOT NULL,
  "day_bucket" text NOT NULL,
  "hour_bucket" text NOT NULL,
  "count_day" integer DEFAULT 0 NOT NULL,
  "count_hour" integer DEFAULT 0 NOT NULL,
  "concurrent" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
