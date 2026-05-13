// 看典 (dian) — vault retrieval (BGE-M3 embeddings + Qwen3-Reranker)
//
// 看典 does NOT make LLM calls. It surfaces the user's own past articles via:
//   - BGE-M3 1024-dim embeddings (SiliconFlow) — see `app/lib/embeddings.ts`
//   - Qwen3-Reranker for top-k pruning — see `app/lib/rerank.ts`
//   - pgvector cosine similarity in Supabase — see `app/lib/vault/search.ts`
//
// The `app/components/floating/VaultTab.tsx` UI renders the retrieved chunks
// chronologically; the user-facing "fox" effect is the returning-visitor bubble
// (`app/components/onboarding/ReturningVisitorBubble.tsx`) which picks its glow
// color from `getProvenanceSummary()` in `app/lib/store/provenance.ts`.
//
// SYSTEM_PROMPT intentionally empty: 看典 is retrieval, not generation.

export const SYSTEM_PROMPT = '' as const;
