# 看山书房 · Kanshan Shufang

一个面向知乎答主的多智能体写作工作台，覆盖 **「灵感激发 → 思路梳理 → 内容精加工」** 全流程。

为 **知乎 Hackathon 2026** 而作 · 单人开发 · Demo Day 2026-05-16。

> 山有九尾，各司其职。看山书房是一个工作台——九只狐狸协助你起草、修订、辩论、并为论点提供出处，但绝不替代你的声音。

---

## 这是什么

看山书房是一个写作工作台，围绕 **9 只各司其职的狐狸** 组织，每只狐狸只做一件事：

| 狐 | 动词 | 职责 |
|---|---|---|
| 看山 | 总管 | 在其他狐狸之间分派任务 |
| 看墨 | 灵感激发 | 起草——根据要点生成第一稿 |
| 看文 | 内容精加工 | 看文/看纹辩论中的「正方·力挺」 |
| 看纹 | 内容精加工 | 看文/看纹辩论中的「反方·质疑」，可由用户自定义人格 |
| 看水 | 思路梳理 | 调研提纲与引用来源 |
| 看殿 | 思路梳理 | 档案库检索——基于 BGE-M3 对你的私人语料做语义检索 |
| 看势 | 灵感激发 | 选题热度参考——仅作灵感，不会自动扩写热榜 |
| 看镜 | 思路梳理 | 数据统计与发文后回看 |
| 看心 | 内容精加工 | 合规与文风/语调把关 |

另有 **4 种固定读者面具**（路人读者 · 业内行家 · 社畜读者 · 边界关注者），以及一个 **看文 vs 看纹辩论面板**，用于压力测试论点。

两种 Demo 模式：

- **`/`** —— 试用模式。可填入自己的 DeepSeek API key，或使用限频访客模式（60 次/小时 · 200 次/日）。
- **`/live`** —— 决赛演示模式。强制使用缓存数据，每一步都已彩排过，现场零 LLM 调用。

## 技术栈

- **前端**：Next.js 15 App Router · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui
- **编辑器**：TipTap，自定义 InlineMark / MarginSeal / CitationMark 扩展
- **状态管理**：Zustand · Framer Motion
- **大模型**：Kimi-K2 (Moonshot AI) 为默认起草与评审；支持 DeepSeek-V3 / DeepSeek-R1 作为 BYO 备选
- **嵌入向量**：BGE-M3 (1024 维) + Qwen3-Reranker，经 SiliconFlow 调用
- **数据库**：Drizzle + Supabase Postgres + pgvector（新加坡区域）
- **测试**：Vitest + React Testing Library + jsdom

## 进度

研发中。共 16 个实现阶段，目前已完成阶段 1–13.9；提交截止 2026-05-14 13:00 BJT。

| 阶段 | 状态 |
|---|---|
| 1–13.9（基础脚手架 → 工作台 → 智能体 → 双 Demo 模式 → 文本质量调优） | 已完成 |
| 14（知乎 API 接入） | 等待 5/12 文档发布 |
| 15（演示彩排） | 待开始 |
| 16（细节打磨——语音 + 图标） | 待开始 |

## 本地运行

```bash
cd app
pnpm install
cp ../.env.example .env.local        # 按需填入你已有的 key
pnpm dlx drizzle-kit migrate          # 应用 cache + rate-limit 表结构
pnpm dev                              # http://localhost:3000
```

需要的环境变量（见 `.env.example`）：

- `KIMI_API_KEY` —— Moonshot Kimi-K2 平台 key（默认起草与评审）
- `DEEPSEEK_API_KEY` —— DeepSeek 平台 key（可选 BYO 备选）
- `SILICONFLOW_API_KEY` —— 嵌入与重排
- `NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`
- `CACHE_MODE` —— `auto`（默认） · `cache-only` · `live-only`

填充 demo 缓存：

```bash
pnpm tsx scripts/seed-demo-cache.ts
```

## 合规

本项目在关键链路上遵循《清朗·算法综合治理》第二阶段思路，以及《生成式人工智能服务管理暂行办法》和《互联网信息服务深度合成管理规定》：

- ❌ 不主张「AI 答主可以替代人类答主」
- ❌ 不做「热榜 → 直接扩写正文」的路径（仅供选题参考）
- ❌ 不向知乎自动发布
- ❌ 不在答主作品上做模型微调
- ❌ 关键链路不接入境外大模型服务
- ❌ MVP 阶段不上线声音 / 人脸合成

涉及声音 / 仿写的输出会附 `GB 45438`「AI 生成可追溯」标识。档案库内容存于新加坡区域，不进入第三方训练集。

## License

MIT —— 详见 [LICENSE](./LICENSE)。

---

_设计 & 开发：Gordon Yang (tyang4@scu.edu) · 2026_
