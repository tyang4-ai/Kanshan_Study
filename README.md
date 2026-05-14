# 看山书房 · Kanshan Shufang

面向知乎答主的多智能体写作工作台。在同一屏内覆盖完整的
**「灵感激发 → 思路梳理 → 内容精加工」** 流程，由 9 只命名狐狸与你协作，而非替代你。

个人独立开发，参赛 **知乎 Hackathon 2026** · 提交于 2026-05-14 · 现场展示 2026-05-16。
线上地址：**https://kanshan.yang9ru.online**。

> 山有九尾，各司其职。看山书房是一个工作台 —— 九只狐狸协助你起草、修订、辩论、并为论点提供出处，但绝不替代你的声音。

---

## 它能做什么

一个写作工作区，9 只狐狸各自负责一个工作流动词：

| 狐狸 | 动词 | 职责 |
|---|---|---|
| 看山 | 调度 | 倾听后，通过 SSE `tool_call` 派遣合适的狐狸 |
| 看墨 | 灵感激发 | 声音指纹改写器 —— 对齐到「你」的档案，而非通用风格 |
| 看文 | 内容精加工 | 4 类读者画像模拟（路人 / 业内 / 社畜 / 边界） |
| 看纹 | 内容精加工 | 对抗式辩论伙伴 —— 找出你论证中的漏洞 |
| 看水 | 思路梳理 | 引用接地 · 三色轨迹（`web` 蓝 / `vault` 棕 / `知乎` 红） |
| 看典 | 思路梳理 | 私库 —— 你自己过往的回答，切块嵌入到 pgvector 供检索 |
| 看势 | 灵感激发 | 知乎热榜雷达 —— **仅作灵感**，拒绝 热榜→正文（清朗 第二阶段 红线） |
| 看镜 | 思路梳理 | 数据 —— 你过往回答获得的反响，不作主观解读 |
| 看心 | 内容精加工 | 合规线 —— 软化无来源的医疗/金融断言，附加 `GB 45438` AI 可追溯标识 |

此外还支持：将 `.md / .txt / .docx` 拖入私库；将草稿导出为
`.md / .txt / .html / .docx / .pdf`；通过官方 HMAC OpenAPI 向知乎圈子发布一条想法；
以及一个介绍狐狸们栖居的 北极小镇·九重书房 世界观的设定门户。

---

## 快速上手（≤ 30 分钟）

```bash
git clone https://github.com/tyang4-ai/Kanshan_Study.git
cd Kanshan_Study/app
pnpm install
cp ../.env.example .env.local         # 填入你拥有的密钥
CACHE_MODE=cache-only pnpm dev        # 无需任何 LLM 密钥也能跑
# 打开 http://localhost:3000
```

`CACHE_MODE=cache-only` 模式下，整个预演的演示流程会以**零次实时 LLM 调用**运行 ——
适合在不配置密钥的前提下评估交互体验。配置好 Supabase + Kimi + SiliconFlow 后即可获得完整的实时 AI。

测试：

```bash
pnpm test                              # 1175+ 测试用例，Vitest + RTL
pnpm tsc --noEmit                      # 严格 TypeScript
pnpm lint                              # ESLint
```

数据库迁移 + 语料种子（可选）：

```bash
pnpm dlx drizzle-kit migrate
pnpm tsx scripts/ingest-corpus.ts me content/corpus/me/articles
pnpm tsx scripts/seed-demo-cache.ts
```

---

## 环境变量

完整列表见 `.env.example`。真正会左右行为的几项：

- `KIMI_API_KEY` —— 默认 LLM（Moonshot Kimi-K2）。实时模式必填。
- `DEEPSEEK_API_KEY` —— 可选的次选模型；仅当用户在 OnboardingGate 提供 DeepSeek 密钥时启用。
- `SILICONFLOW_API_KEY` —— 嵌入（BGE-M3）+ 重排（Qwen3）。
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` +
  `SUPABASE_SERVICE_ROLE_KEY` —— Drizzle + pgvector 存储。
- `ZHIHU_ACCESS_SECRET` + `ZHIHU_APP_KEY` + `ZHIHU_APP_SECRET` —— 知乎双签名
  （`developer.zhihu.com` 用 Bearer，`openapi.zhihu.com` 用 HMAC）。
- `CACHE_MODE` —— `auto`（默认）· `cache-only` · `live-only`。
- `KANSHAN_PUBLIC_MODE` —— 在共享部署上设为 `byo-or-cache`。
  开启后，匿名访客（请求头没有 `Authorization: Bearer sk-…`）会被强制走 cache-only ——
  部署方自己的 LLM 密钥永远不会消耗在他们身上。要使用实时 AI，需要在 OnboardingGate
  自带（BYO）密钥。**`kanshan.yang9ru.online` 部署在评审窗口期内即运行于此模式。**

---

## 技术栈

- **Next.js 15 App Router** · React 19 · TypeScript strict · Tailwind v4 · shadcn/ui
- **TipTap** 编辑器，自定义 `InlineMark` / `MarginSeal` / `CitationMark` 扩展
- **Zustand** 状态管理，**Framer Motion** 动画
- **Kimi-K2**（Moonshot）作为主 LLM · **DeepSeek-V3 / R1** 作为 BYO 次选
- 经由 SiliconFlow 调用 **BGE-M3**（1024 维）+ **Qwen3-Reranker**
- **Drizzle** + **Supabase Postgres**（新加坡区）+ **pgvector**
- **Vitest** + React Testing Library + jsdom —— 截稿时共 1175 条测试

完整第三方许可证 + 致谢见：[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)。

---

## 合规姿态

本项目刻意拒绝了若干在监管语境下被视为对 AI 辅助写作工具有风险的模式：

- ❌ 不宣称「AI 答主取代人类答主」
- ❌ 不自动向知乎发布（始终要求用户亲手点击）
- ❌ 不在作者语料上做微调（私库内容仅用于检索）
- ❌ 不允许 `热榜 → 直接扩写 正文`（清朗 第二阶段 红线 —— 由二次确认弹窗拦截）
- ❌ 关键路径不调用美国 AI 提供商（备案合规 —— 仅 Kimi + DeepSeek）
- ❌ MVP 不出货语音 / 人脸合成（深度合成规定 —— 推迟到提交后的打磨阶段）

任何由 看墨 改写的文本都会附加 `GB 45438` AI 可追溯标识。私库内容存储在
Supabase 新加坡区，绝不进入任何第三方训练集。

---

## 仓库结构

```
README.md / LICENSE / THIRD_PARTY_NOTICES.md / .env.example   # ← 你现在看到的层
app/                                                          # 整个 Next.js 应用
  app/                路由（页面 + API）
  components/         atoms / chrome / editor / floating / rail / lore / tour
  lib/                store/ · llm/ · zhihu/ · cache/ · io/ · foxes/ · personas/
  content/            种子 JSON · 各账号的文章语料 · 知乎样例数据
  drizzle/            数据库迁移
  scripts/            ingest-corpus · seed-demo-cache · cache-zhihu-demo
  tests/              1175+ 单元 / 集成 / 路由 / 组件测试
```

黑客松规划文档、评委评审、画像简报与彩排素材均存放在本地的
`Documents/`、`plans/`、`.claude/` 目录下 —— 这些目录被有意 gitignore
（本仓库仅包含代码 + 资源）。

---

## 许可证

MIT —— 见 [`LICENSE`](./LICENSE)。

第三方模型与库的许可证保存在
[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)。刘看山 IP 的使用遵循
知乎黑客松 2026 组委会确认的默认授权
（「比赛期间官方默认为作者授权，可以二改」）；黑客松之后若用于商业用途，
需与知乎另行商谈授权。

---

_由 **Gordon Yang**（tyang4@scu.edu）独立设计与开发 · 圣克拉拉大学
生物医学工程 · 2026。_
