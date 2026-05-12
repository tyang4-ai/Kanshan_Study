# 看山书房 · Kanshan Shufang

A multi-agent writing workbench for 知乎 answer-authors. Covers the full
**「灵感激发 → 思路梳理 → 内容精加工」** loop in a single screen, with 9
named-fox agents collaborating with you instead of replacing you.

Built solo for **知乎 Hackathon 2026** · submission 2026-05-14 · demo
2026-05-16. Live at **https://kanshan.yang9ru.online**.

> 山有九尾，各司其职。看山书房是一个工作台 —— 九只狐狸协助你起草、修订、辩论、并为论点提供出处，但绝不替代你的声音。

---

## What it does

A writing workspace where 9 foxes each own one workflow verb:

| Fox | Verb | Role |
|---|---|---|
| 看山 | orchestrate | Listens, then dispatches the right fox via SSE `tool_call` |
| 看墨 | 灵感激发 | Voice-fingerprint rewriter — aligns text to YOUR archive, not a generic style |
| 看文 | 内容精加工 | 4-persona reader simulation (路人 / 业内 / 社畜 / 边界) |
| 看纹 | 内容精加工 | Adversarial debate partner — finds the holes in your argument |
| 看水 | 思路梳理 | Citation grounding · 3-color trail (`web` blue / `vault` brown / `知乎` red) |
| 看典 | 思路梳理 | Vault — your own past answers, chunked + embedded into pgvector for retrieval |
| 看势 | 灵感激发 | 知乎 hot-list radar — **inspiration only**, refuses 热榜→正文 (清朗 第二阶段 红线) |
| 看镜 | 思路梳理 | Stats — what your past answers earned, no editorialization |
| 看心 | 内容精加工 | ComplianceLine — softens unsourced medical/finance claims, adds `GB 45438` AI-trace label |

Plus: drag-drop `.md / .txt / .docx` into the vault, export drafts as
`.md / .txt / .html / .docx / .pdf`, publish a pin to a 知乎 圈子 via the
official HMAC OpenAPI, and a lore portal for the 北极小镇 九重书房 world the
foxes live in.

---

## Quickstart (≤ 30 minutes)

```bash
git clone https://github.com/tyang4-ai/Kanshan_Study.git
cd Kanshan_Study/app
pnpm install
cp ../.env.example .env.local         # fill in the keys you have
CACHE_MODE=cache-only pnpm dev        # works without any LLM key
# open http://localhost:3000
```

`CACHE_MODE=cache-only` runs the entire pre-rehearsed demo flow with **zero
live LLM calls** — useful if you want to evaluate the UX without provisioning
keys. With Supabase + Kimi + SiliconFlow configured you get full live AI.

Tests:

```bash
pnpm test                              # 1175+ tests, Vitest + RTL
pnpm tsc --noEmit                      # strict TypeScript
pnpm lint                              # ESLint
```

DB migrate + corpus seed (optional):

```bash
pnpm dlx drizzle-kit migrate
pnpm tsx scripts/ingest-corpus.ts me content/corpus/me/articles
pnpm tsx scripts/seed-demo-cache.ts
```

---

## Environment

See `.env.example` for the full list. The ones that actually gate behavior:

- `KIMI_API_KEY` — default LLM (Moonshot Kimi-K2). Required for live mode.
- `DEEPSEEK_API_KEY` — optional secondary; only used when a user supplies a
  DeepSeek key in OnboardingGate.
- `SILICONFLOW_API_KEY` — embeddings (BGE-M3) + reranker (Qwen3).
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` +
  `SUPABASE_SERVICE_ROLE_KEY` — Drizzle + pgvector storage.
- `ZHIHU_ACCESS_SECRET` + `ZHIHU_APP_KEY` + `ZHIHU_APP_SECRET` — 知乎 dual-auth
  (Bearer for `developer.zhihu.com`, HMAC for `openapi.zhihu.com`).
- `CACHE_MODE` — `auto` (default) · `cache-only` · `live-only`.
- `KANSHAN_PUBLIC_MODE` — set to `byo-or-cache` for shared deployments.
  When on, anonymous visitors (no `Authorization: Bearer sk-…` header) are
  forced to cache-only — the deployment's own LLM keys are never spent on
  them. Live AI requires a BYO key at the OnboardingGate. **The deployment
  at `kanshan.yang9ru.online` runs in this mode** through the judging window.

---

## Tech stack

- **Next.js 15 App Router** · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui
- **TipTap** editor with custom `InlineMark` / `MarginSeal` / `CitationMark` extensions
- **Zustand** state, **Framer Motion** animations
- **Kimi-K2** (Moonshot) primary LLM · **DeepSeek-V3 / R1** BYO secondary
- **BGE-M3** (1024-dim) + **Qwen3-Reranker** via SiliconFlow
- **Drizzle** + **Supabase Postgres** (Singapore region) + **pgvector**
- **Vitest** + React Testing Library + jsdom — 1175 tests at the time of writing

Full third-party licenses + attribution: [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).

---

## Compliance posture

The project deliberately refuses several patterns the regulatory environment
treats as risky for AI-augmented writing tools:

- ❌ Does not claim "AI 答主 replaces human 答主"
- ❌ Does not auto-publish to 知乎 (always requires the user's own click)
- ❌ Does not fine-tune on author corpora (vault content is retrieval-only)
- ❌ Does not allow `热榜 → 直接扩写 正文` (清朗 第二阶段 红线 — gated by a confirm dialog)
- ❌ Does not call US AI providers on the critical path (备案 hygiene — Kimi + DeepSeek only)
- ❌ Does not ship voice / face synthesis in the MVP (深度合成规定 — deferred to post-submission polish)

`GB 45438` AI-trace labels are attached to any text 看墨 rewrites. Vault
content is stored in the Singapore Supabase region and never enters
third-party training sets.

---

## Repo layout

```
README.md / LICENSE / THIRD_PARTY_NOTICES.md / .env.example   # ← what you see here
app/                                                          # the entire Next.js app
  app/                routes (pages + API)
  components/         atoms / chrome / editor / floating / rail / lore / tour
  lib/                store/ · llm/ · zhihu/ · cache/ · io/ · foxes/ · personas/
  content/            seed JSON · per-account 文章 corpus · zhihu fixtures
  drizzle/            migrations
  scripts/            ingest-corpus · seed-demo-cache · cache-zhihu-demo
  tests/              1175+ unit / integration / route / component tests
```

Hackathon planning docs, judge reviews, persona briefings, and rehearsal
artifacts live locally under `Documents/`, `plans/`, and `.claude/` — those
directories are gitignored intentionally (this repo is code + assets only).

---

## License

MIT — see [`LICENSE`](./LICENSE).

Third-party model and library licenses preserved in
[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md). The 刘看山 IP appears
under the 知乎 黑客松 2026 organizer-confirmed default authorization
("比赛期间官方默认为作者授权，可以二改"); post-hackathon commercial use would
require a separate licensing conversation with 知乎.

---

_Designed & built by **Gordon Yang** (tyang4@scu.edu) · Santa Clara University
biomedical engineering · 2026._
