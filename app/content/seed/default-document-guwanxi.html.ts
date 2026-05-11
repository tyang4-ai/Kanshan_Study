// Initial body HTML for 顾婉昔's editor. Round-trips through the same
// extensions as the `me` default doc (StarterKit + InlineMark + CitationMark).
// R6 demo-flow review (Tan Shulin) P0: on /live the account-switch beat
// (0:30 → 顾婉昔 · 同步刷新档案库 + 语风指纹) used to land on the empty
// placeholder because TipTapEditor's per-account localStorage key had no
// persisted doc and no per-account seed was wired. This file is that seed.
//
// Source paragraphs lifted verbatim (and lightly stitched) from the seed
// articles under content/corpus/guwanxi/articles/ so 顾婉昔's editor opens
// on her own voice from the very first frame, no rehearsal warm-up needed.

export const DEFAULT_DOC_HTML_GUWANXI = `
<h1>影像 AI 的"幸存者偏差"陷阱</h1>
<p>这两年我反复想一件事——<strong>影像 AI 论文里"超越放射科医生"的结论，到底是真的，还是被数据集挑出来的？</strong>放射学顶刊上动辄 AUC 0.95 的模型，落到我们科里，常常水土不服。原因不在算法，而在<span data-mark-kind="claim" data-mark-hint="医学声明 · 看心建议软化措辞">数据集本身的幸存者偏差</span>。</p>
<p><span data-mark-kind="ai-touched" data-mark-hint="看墨 · 续写 · 已校验">公开数据集（TCIA、LIDC、CheXpert）筛过的影像，往往是教学意义上的"典型病例"。技师拍得标准、放射科签字快速、临床信息完整。这种"干净"恰恰是真实临床的反面——夜班里，CT 扫得歪、患者动了、机器电压不稳，是常态。</span>论文里测出来的模型在这些"非典型"图像上崩盘<sup data-citation-id="cite-w-3" data-kind="web" data-cite-label="[3]">[3]</sup><sup data-citation-id="cite-v-7" data-kind="vault" data-cite-label="[v7]">[v7]</sup>。</p>
<h2>一、"被纳入"本身就是偏差</h2>
<p>第一层偏差，是<strong>哪些病例被收进数据集</strong>。TCIA 这类公开集，几乎都来自学术医院的研究项目——而学术医院的患者本身就有筛选效应：能负担转诊、能配合多模态检查、影像质量过关。基层医院的病例，统计意义上是看不到的。</p>
<blockquote>💭 这一段需要补一个对比：基层 CT 影像噪点 / 伪影的真实比例 vs TCIA 的标准化样本。</blockquote>
<h2>二、"被标注"是第二重筛选</h2>
<p>第二层偏差，是<strong>哪些病例被标注</strong>。标注是人力活，需要两名以上放射医生独立画 ROI 然后取交集。这套流程下来，<span data-mark-kind="hedge" data-mark-hint="看心 · 已软化：『难以纳入』而非『不可能纳入』">那些边界模糊、典型程度不高的病例难以纳入</span>——但这些"难判读"的病例，恰恰是临床上 AI 应该帮忙的对象<sup data-citation-id="cite-z-leng" data-kind="zhihu" data-cite-label="[@冷泉]">[@冷泉]</sup>。</p>
<p>……</p>
`.trim();
