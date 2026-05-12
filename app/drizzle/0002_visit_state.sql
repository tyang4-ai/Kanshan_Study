-- R3 fix (李笛 / 徐诗 P1 2026-05-12): cross-device visit-state mirror.
-- Client persists to localStorage (`kanshan-last-visit`) and pushes a
-- debounced snapshot to this table every ~30s. On mount the client
-- compares `updated_at` and pulls server state if newer.

CREATE TABLE IF NOT EXISTS "visit_state" (
  "account_id" text PRIMARY KEY,
  "last_visits" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "session_count" integer DEFAULT 0 NOT NULL,
  "cross_fox_event_count" integer DEFAULT 0 NOT NULL,
  "trend_outbound_clicks" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
