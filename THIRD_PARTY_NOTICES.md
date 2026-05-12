# Third-party notices

看山书房 (Kanshan Shufang) is distributed under the MIT license (`LICENSE`),
but builds on the open-source work below. This file lists every load-bearing
upstream dependency and the license it ships under, so anyone forking the
project can verify compliance and understand attribution.

If you find an omission, please open an issue.

---

## Runtime models

| Component | Provider / project | License | Notes |
|---|---|---|---|
| Kimi-K2 (moonshot-v1-128k) | Moonshot AI · `platform.moonshot.cn` | Commercial API (Moonshot ToS) | Default drafter + critic LLM. Hackathon ¥199 credit issued by 知乎 organizers 2026-05-12. |
| DeepSeek-V3 / DeepSeek-R1 | DeepSeek · `platform.deepseek.com` | Commercial API (DeepSeek ToS) | Optional BYO secondary. |
| 知乎直答 (Zhihu RAG) | 知乎 · `developer.zhihu.com/v1/chat/completions` | 知乎 OpenAPI ToS | Optional tertiary provider. |
| BGE-M3 (`BAAI/bge-m3`) | Beijing Academy of AI (BAAI) | MIT | 1024-dim multilingual embedding. Served via SiliconFlow. Paper: Chen et al. 2024. |
| Qwen3-Reranker (`Qwen/Qwen3-Reranker-8B`) | Alibaba Cloud Qwen | Apache 2.0 | Reranker over BGE-M3 top-k. Served via SiliconFlow. |
| SiliconFlow API | siliconflow.cn | Commercial API ToS | Inference for BGE-M3 + Qwen3-Reranker. |

## UI / editor

| Library | Version | License |
|---|---|---|
| Next.js | 15.x | MIT |
| React | 19.x | MIT |
| Tailwind CSS | v4 | MIT |
| shadcn/ui | — | MIT |
| TipTap (StarterKit + Placeholder + Highlight + TextStyle + Color + FontFamily) | 3.x | MIT |
| `tiptap-markdown` | 0.9.x | MIT |
| Framer Motion | 11.x | MIT |
| Zustand | 5.x | MIT |
| `lucide-react` (icons) | — | ISC |

## Backend / data

| Library | License |
|---|---|
| Drizzle ORM | Apache 2.0 |
| `postgres` (drizzle driver) | Unlicense / MIT |
| Supabase Postgres | Apache 2.0 (server) · MIT (client SDK) |
| pgvector | PostgreSQL license |
| `gray-matter` (frontmatter) | MIT |
| `nodejieba` (Chinese tokenization) | MIT |

## File I/O

| Library | License |
|---|---|
| `marked` (Markdown → HTML) | MIT |
| `mammoth` (`.docx` → HTML) | BSD-2-Clause |
| `docx` (HTML/JSON → `.docx`) | MIT |
| `jspdf` (`.pdf` writer) | MIT |
| `html2canvas` (DOM rasterizer used for PDF export) | MIT |

## Tooling / tests

| Tool | License |
|---|---|
| Vitest | MIT |
| React Testing Library | MIT |
| ESLint | MIT |
| TypeScript | Apache 2.0 |
| pnpm | MIT |
| `drizzle-kit` | MIT |

## Fonts

| Font | License |
|---|---|
| Noto Serif SC / Noto Sans SC | SIL Open Font License 1.1 |
| Source Han Serif SC / Sans SC | SIL Open Font License 1.1 |
| JetBrains Mono | SIL Open Font License 1.1 |

## IP / artwork

| Asset | Source | Authorization |
|---|---|---|
| 刘看山 (Liu Kanshan) four-view sprite (`app/public/foxes/shan-fourview.png`) | 知乎 official IP | 知乎 黑客松 2026 organizer-confirmed default authorization ("比赛期间官方默认为作者授权，可以二改", mentor reply 2026-05-11). Post-hackathon commercial use requires a separate license with 知乎. |
| 9-fox tail + body PNGs (`app/public/foxes/tail-*.png`, `body.png`) | Original artwork by Gordon Yang | MIT (with this project) — derivative original characters inspired by minimalist East-Asian mascot tradition. |

---

## Citation

If you build on the voice-fingerprint or 9-fox orchestration ideas, a
reference to this repository is appreciated but not required:

```
Yang, Gordon. 看山书房 (Kanshan Shufang).
知乎 Hackathon 2026 submission. https://github.com/tyang4-ai/Kanshan_Study
```

The BGE-M3 paper that the vault retrieval is built on:

```
Chen, Jianlv et al. "BGE M3-Embedding: Multi-Lingual, Multi-Functionality,
Multi-Granularity Text Embeddings Through Self-Knowledge Distillation."
2024. arXiv:2402.03216.
```
