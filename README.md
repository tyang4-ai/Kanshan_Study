# 看山书房 · Kanshan Shufang

A multi-agent 工作台 that helps 知乎答主 walk through **「灵感激发 → 思路梳理 → 内容精加工」**.

Built for **知乎 Hackathon 2026** · solo dev · Demo Day 2026-05-16.

> 山有九尾，各司其职。看山书房 is a workspace where nine fox agents help you draft, revise, debate, and ground your answers — without replacing your voice.

---

## What it is

看山书房 is a writing workspace organized around **9 specialized fox agents**, each with a single verb:

| 狐 | Verb | What it does |
|---|---|---|
| 看山 | orchestrate | Routes work between the other foxes |
| 看墨 | 灵感激发 | Drafter — generates first-pass content from your bullets |
| 看文 | 内容精加工 | Pro-stance critic in 看文/看纹 debate |
| 看纹 | 内容精加工 | Counter-stance critic; user-customizable persona |
| 看水 | 思路梳理 | Research outliner + citation source |
| 看殿 | 思路梳理 | Vault retriever — your archived corpus, BGE-M3 grounded |
| 看势 | 灵感激发 | Trends scout — selection-only, never auto-expands hot topics |
| 看镜 | 思路梳理 | Stats / post-publish loop |
| 看心 | 内容精加工 | Compliance + voice / tone guard |

Plus **4 fixed reader masks** (路人读者 · 业内行家 · 社畜读者 · 边界关注者) and a **看文 vs 看纹** debate panel for stress-testing claims.

Two demo modes:

- **`/`** — clickthrough mode. Bring your own DeepSeek API key, or use rate-limited guest mode (60/hr · 200/day).
- **`/live`** — finals demo mode. Forced cache-only — every step pre-rehearsed, zero LLM hits during a live presentation.

## Stack

- **Frontend**: Next.js 15 App Router · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui
- **Editor**: TipTap with custom InlineMark / MarginSeal / CitationMark extensions
- **State**: Zustand · Framer Motion
- **LLM**: DeepSeek-V3 (drafter) + DeepSeek-R1 (critic) via SiliconFlow
- **Embeddings**: BGE-M3 (1024-dim) + Qwen3-Reranker
- **DB**: Drizzle + Supabase Postgres + pgvector (Singapore)
- **Tests**: Vitest + React Testing Library + jsdom

## Status

Active development. 13 of 17 implementation phases complete; submission deadline 2026-05-14 13:00 BJT.

| Phase | Status |
|---|---|
| 1–13 (foundation → workspace → agents → demo modes) | done |
| 14 (知乎 API integration) | gated on 5/9 docs release |
| 15 (demo cache seed) | folded into 13; needs run with real keys |
| 16 (testing pass + text-quality audit) | pending |
| 17 (polish — voice + icon) | pending |

## Local setup

```bash
cd app
pnpm install
cp ../.env.example .env.local       # fill in the keys you have
pnpm dlx drizzle-kit migrate         # applies cache + rate-limit tables
pnpm dev                             # http://localhost:3000
```

Required env (see `.env.example`):

- `DEEPSEEK_API_KEY` — DeepSeek platform key (drafter + critic)
- `SILICONFLOW_API_KEY` — embeddings + reranker
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `CACHE_MODE` — `auto` (default) · `cache-only` · `live-only`

To populate the demo cache:

```bash
pnpm tsx scripts/seed-demo-cache.ts
```

## Compliance

This project follows 清朗 第二阶段 guidance and 深度合成规定 in its critical path:

- ❌ No "AI 答主可以替代人类答主" framing
- ❌ No 热榜 → 直接扩写正文 path (selection only)
- ❌ No auto-post to 知乎
- ❌ No fine-tune on 答主 content
- ❌ No US providers in critical path
- ❌ No voice/face features in MVP

Voice / cloning surfaces are tagged with `GB 45438` "AI 生成可追溯" stamps. Vault content stays in Singapore; not used for training.

## License

MIT — see [LICENSE](./LICENSE).

---

_设计 & 开发: Gordon Yang (tyang4@scu.edu) · 2026_
