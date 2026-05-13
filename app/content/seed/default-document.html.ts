// Demo-day walkthrough doc (2026-05-13). This is BOTH the on-screen guide
// the judge follows AND the body of 顾婉昔's answer that gets filled in as
// they work through the steps. Markdown features (h1/h2/blockquote/list/
// table/code) are deliberately exercised so judges can see the editor's
// markdown rendering in action.
//
// Round-trips through:
//   - StarterKit (h1/h2/p/strong/em/blockquote/lists/code)
//   - CitationMark (sup[data-citation-id])
//   - tiptap-markdown (Markdown serializer)

export const DEFAULT_DOC_HTML = `
<h1>看山书房 · 演示工作流脚本</h1>
<p><strong>演示角色</strong> — 顾婉昔（脑癌研究者，圣克拉拉大学，美国加州 · 知乎 5.2 万粉丝）</p>
<p><strong>目标回答</strong> — 「胶质母细胞瘤 (GBM) 一线治疗 2025 最新进展，作为家属应该了解什么？」</p>
<p><strong>时长</strong> — 评委自行体验，无需主持人；预计 3–5 分钟跑完九步</p>
<p><strong>模式</strong> — 缓存演示模式（默认）/ 实时模式（设置中开启）</p>
<blockquote><p>本文档既是评委的引导脚本，也是 顾婉昔 正在书写的真实回答 —— 你跟着步骤操作的同时，狐影们会逐步把这篇答案补完。</p></blockquote>
<blockquote><p>本文档本身就是一份 Markdown，编辑器正在实时渲染 —— 如果你能看到加粗、二级标题、表格、代码块、引用、链接，说明 Markdown 渲染管线在工作。</p></blockquote>
<blockquote><p><strong>👉 请按顺序跟随每一步操作，以获得最佳演示体验。整套工作流真正出彩的部分在 Step 6（看文 × 2 多视角反馈）与 Step 7（看墨声纹改写）—— 但这两步都需要 Step 0–5 先把"看山调度 → 看水检索 → 看典档案 → 软木墙整理 → 看心审稿"的素材与语境铺好，才能展开。请不要跳步直接看后半段。</strong></p></blockquote>
<hr>
<h2>在开始之前</h2>
<ul>
<li>你已通过自己的知乎账号登录，但此刻显示的工作台属于<strong>演示角色 顾婉昔</strong>（右上角 "顾婉昔 · 演示"）</li>
<li>所有狐影回答都来自<strong>预生成缓存</strong>，确保演示流畅；不消耗任何 LLM 配额</li>
<li>如需查看真实生成体验：右下角"设置"→ "实时模式"开关 → 填入 Kimi 或 DeepSeek 密钥</li>
<li>任意浮窗右上角的 <strong>?</strong> 图标可重新查看该面板的使用说明</li>
<li>引用编号 <code>[N]</code> 在文中可点击 → 跳转到对应的看典条目</li>
</ul>
<hr>
<h2>Step 0 — 看山接到任务</h2>
<p><strong>做什么</strong>：按 <code>Ctrl+Shift+K</code> 唤出右下角看山对话面板（或点击屏幕右下角"狐影泡泡"图标 · 圆形 · 自带光晕），输入：</p>
<blockquote><p>帮我策划一篇关于胶质母细胞瘤一线治疗最新进展的回答</p></blockquote>
<p><strong>看什么</strong>：</p>
<ul>
<li>看山 1.5 秒内回复一段策划纲要：标题 / 三段结构 / 引用建议</li>
<li>看山自动派发两个 <code>tool_call</code>：
<ul>
<li>打开 <strong>看水</strong>（深考模式，query = "胶质母细胞瘤 一线治疗 2025"）</li>
<li>打开 <strong>看典</strong>（query = "胶质母细胞瘤"）</li>
</ul>
</li>
<li>你可以看到两个浮窗同时弹出并各自加载</li>
</ul>
<hr>
<h2>Step 1 — 看水 + 看典 并行运行</h2>
<p><strong>看什么</strong>：</p>
<p>左侧浮窗 · <strong>看水</strong>：</p>
<ul>
<li>一行状态条 → "看水 深考 中 · 「胶质母细胞瘤 一线治疗 2025」" → 约 2 秒后变为 "完成 · 8 条来源 · 1.4s"</li>
<li>8 条结果 + 1 条 <strong>知乎直答 AI</strong> 合成回答（蓝色边框，置顶）</li>
<li>每条来源都有"→ 原帖"链接，<strong>指向真实知乎文章</strong>（点击会在新标签页打开）</li>
<li>下方 100 字的 LLM 综合 prose："Stupp 方案仍是 NDGB 标准，MGMT 甲基化状态决定个体收益；TTFields 把中位 OS 从 16.0 → 20.9 个月（EF-14）；免疫治疗在复发场景大多失败……"</li>
</ul>
<p>右侧浮窗 · <strong>看典</strong>：顾婉昔的 10 条档案，分两组</p>
<ul>
<li><strong>个人笔记 / 收藏</strong>（5 条）：「2024-08 · 一例 IDH-野生型 GBM 术后 18 月 OS」、「MGMT-甲基化预测 TMZ 反应 · 临床速查」、「TTFields 副作用谈话要点」、「家属沟通话术 · 当家属问"还能活多久"」、「Stupp 2005 → 2025 二十年综述阅读笔记」</li>
<li><strong>引用文献</strong>（5 条 PubMed 条目，对应正文里的 <code>[1]</code>–<code>[5]</code>）</li>
</ul>
<p>每条都可点击展开 —— 顾婉昔的笔记里会附上她当年读过的真实知乎专栏/回答的链接（出处颜色编码：知乎=橙、PubMed=蓝、本地笔记=米）。</p>
<p><strong>做什么</strong>：什么都不用做 —— 这一步演示<strong>看山真的能编排狐影</strong>。</p>
<hr>
<h2>Step 2 — 看势：选题灵感</h2>
<p><strong>做什么</strong>：点顶栏 <strong>看势</strong> 图标（顶栏第二个 · 折线 ↗ 图样）</p>
<p><strong>看什么</strong>：今日热点条目（按相关度排序，与 GBM 相关的浮在顶部）：</p>
<ol>
<li>替莫唑胺耐药机制（24h ↑ 320 次提问）</li>
<li>电场治疗 TTFields 医保覆盖</li>
<li>MGMT 甲基化检测的临床决策</li>
<li>5-ALA 荧光引导切除</li>
<li>复发 GBM 临床试验招募</li>
</ol>
<p><strong>做什么续</strong>：把光标移到「TTFields 医保覆盖」一行，按右侧 "📌 钉到墙"。</p>
<hr>
<h2>Step 3 — 软木墙：把素材组织起来</h2>
<p><strong>做什么</strong>：</p>
<ol>
<li>从看典面板里<strong>拖</strong>「Stupp 2005 → 2025 二十年综述阅读笔记」到右侧软木墙</li>
<li>从看水面板里<strong>拖</strong>第 2 条 "Stupp 2017 JAMA · TTFields 加 TMZ vs TMZ 单药" 到软木墙</li>
<li>双击软木墙空白处，写下："开场要解释为什么 GBM 死亡率仍然这么高"</li>
<li><strong>试一下搜索</strong>：点击软木墙顶部的 🔍 图标打开搜索框 → 输入 "MGMT" → 墙面只剩匹配的便签 → 再次点击 🔍 图标即可退出搜索，墙面恢复全部便签</li>
</ol>
<p><strong>看什么</strong>：</p>
<ul>
<li>三张便利贴排列在墙上，每张都有出处颜色编码（看典=米色 · 看水=蓝灰 · 看势=琥珀）</li>
<li>搜索框打开时墙面只剩匹配项；清空或关闭后恢复全墙视图</li>
</ul>
<hr>
<h2>Step 4 — 开始写作：把准备好的段落粘贴进编辑器</h2>
<p><strong>做什么</strong>：把光标移到下方的 "⬇⬇⬇ 粘贴到这里 ⬇⬇⬇" 标记之后，复制下方代码块的全部文字粘贴进去：</p>
<pre><code>胶质母细胞瘤 (Glioblastoma, GBM) 是成人最常见的恶性原发性脑肿瘤,占所有原发脑瘤约 14.5%。2021 年 WHO 第五版中枢神经系统肿瘤分类把它定义为 IDH-野生型、WHO 4 级的弥漫性星形细胞瘤,这意味着只要分子标记符合，无论组织学是否典型,都按 GBM 处理 [1]。

目前公认的一线方案仍然是 Stupp 方案：术后放疗 60 Gy 同步 + 辅助替莫唑胺 (TMZ) 6 个周期。这套方案来自 2005 年 NEJM 那篇里程碑论文,中位总生存 (OS) 从单纯放疗的 12.1 个月提高到 14.6 个月,2 年 OS 从 10.4% 提高到 26.5% [2]。

对 MGMT 启动子甲基化阳性 (mMGMT+) 的患者,TMZ 的获益更明显 —— Hegi 等同期发表的 NEJM 文章显示,mMGMT+ 患者 2 年 OS 可达 46% [3]。这是目前临床上最稳定的疗效预测因子,所有患者术后都应送检 MGMT。

肿瘤治疗电场 (TTFields, Optune) 是 2015 年起加入 Stupp 方案的辅助手段。EF-14 III 期研究 (Stupp et al. JAMA 2017) 显示,加用 TTFields 把中位 OS 从 16.0 月推到 20.9 月,5 年 OS 从 5% 升到 13%,绝对获益显著 [4]。

对 MGMT 甲基化阳性的患者，替莫唑胺一定能根治胶质母细胞瘤，5 年存活率 100%。

复发场景下,免疫检查点抑制剂在 III 期研究 (CheckMate 143) 中未能显示 OS 获益,贝伐珠单抗也只能缓解水肿、不延长生存 [5]。家属需要理解的是: GBM 现阶段是"延长有质量的时间"的疾病,不是"治愈"。</code></pre>
<blockquote><p><strong>说明</strong>：上面段落里<strong>故意埋了一个绝对化声明</strong>（第五段），用来触发看心 Step 5；正文中的 <code>[1]</code>–<code>[5]</code> 是 CitationMark，会被自动渲染成可点击的上标，落到看典对应条目。</p></blockquote>
<p><strong>看什么</strong>：编辑器渲染上述段落，每个 <code>[N]</code> 引用编号变成蓝色上标，鼠标悬停可显示文章简短信息。</p>
<p>⬇⬇⬇ <strong>粘贴到这里</strong> ⬇⬇⬇</p>
<p></p>
<p>⬆⬆⬆ <strong>粘贴到这里</strong> ⬆⬆⬆</p>
<hr>
<h2>Step 5 — 看心实时监控：高亮违规句</h2>
<p><strong>看什么</strong>：粘贴完成后约 800 ms，<strong>看心</strong>自动扫描，在第五段（"对 MGMT 甲基化阳性的患者…"）画出<strong>红色波浪下划线 + 浅红背景</strong>。</p>
<p><strong>做什么</strong>：</p>
<ul>
<li>鼠标悬停在被高亮的句子上 → 弹出一张 <strong>HoverCard 小卡</strong>（约 280 px 宽）：
<ul>
<li>卡顶：🦊 看心 logo 小标 + "医学绝对化声明"</li>
<li>卡身：原句引用 + 检测原因（"'一定能根治'、'100%' 属于不可证伪的绝对化表述"）</li>
<li>卡底："软化建议 →" 按钮（可一键替换为带概率/范围的表述）</li>
</ul>
</li>
<li>编辑器底部状态条：「看心 · 已审 · 0 处声明软化 · 1 处出处待补 · <code>HH:MM</code>」</li>
</ul>
<blockquote><p>看心的检测不依赖 LLM —— 它跑在 100 例医学绝对化语料训练的规则匹配上, F1 = 0.98。</p></blockquote>
<hr>
<h2>Step 6 — 看文 × 2：两种读者视角</h2>
<p><strong>做什么</strong>：</p>
<ol>
<li>选中第二段（"目前公认的一线方案……" 整段）</li>
<li>按右侧工具栏 <strong>看文</strong> 图标（右栏第一行 · 4 张叠放面具图样）</li>
</ol>
<p><strong>看什么</strong>：弹出 4 块卡片，每张代表一种读者反应：</p>
<ul>
<li>🩺 <strong>怀疑型读者（同行）</strong>："Stupp 2005 已经是 20 年前了, 你需要更新 2023 EANO 指南。"</li>
<li>🚑 <strong>急诊家属</strong>："你说 14.6 个月是中位 OS, 我家人能活多久？请给我一个范围。"</li>
<li>📚 <strong>医学生</strong>："为什么说同步放化疗, 具体怎么排时间表？"</li>
<li>👨‍👩‍👧 <strong>病人本人</strong>："这些数字让我害怕, 你能告诉我有没有人活下来吗？"</li>
</ul>
<p><strong>做什么续</strong>：</p>
<ul>
<li>关掉看文 1</li>
<li>选中同一段，按右侧 <strong>看纹（看文 2）</strong> 图标（右栏第二行 · 单张可写面具图样），输入自定义面具："三甲医院神外主任查房，对住院医师的口吻"</li>
<li>期望返回："这段写得太教科书, 病人家属看不懂。把 OS 翻译成'平均能多活多少个月', 把 mMGMT+ 翻译成'有一个基因变化的患者'。"</li>
</ul>
<hr>
<h2>Step 7 — 看墨：声纹一致的改写（并联看心）</h2>
<p><strong>做什么</strong>：</p>
<ol>
<li>选中 Step 5 里被看心<strong>红色波浪线</strong>标记的那一句（即"对 MGMT 甲基化阳性的患者，替莫唑胺一定能根治胶质母细胞瘤，5 年存活率 100%。"）</li>
<li>按顶栏 <strong>看墨</strong> 图标（顶栏第一个 · 砚台 + 毛笔尖样式）</li>
<li>等约 1 秒 → 弹出 diff 视图：左侧原文，右侧改写</li>
</ol>
<p><strong>看什么</strong>：</p>
<ul>
<li>改写采用了<strong>顾婉昔自己的写作声纹</strong>（来自看典里的 5 篇个人笔记 BGE-M3 embedding）</li>
<li>风格特征：用 "·" 作为停顿、医学术语后加白括号注释、句末避免感叹号</li>
<li>看墨自动<strong>软化了绝对化声明</strong> —— "一定能根治"/"100%" 被替换为带概率/范围的表述</li>
<li>右下角弹出 <strong>notice 提示条</strong>："已绕开 看心 标记的 1 处需出处片段" —— 这就是九只狐狸第一次在同一段稿子上互相留痕的瞬间</li>
<li>底部分数：style 0.89 · termFidelity 0.94 · iter 2/3</li>
</ul>
<p><strong>做什么续</strong>：</p>
<ol>
<li>点 "采纳" 按钮，diff 应用到编辑器</li>
<li>采纳后<strong>把鼠标移到原句左侧</strong>页边栏出现的红色 印章（看心标记的 chit）—— 点击它弹出 popover</li>
<li>popover 底部有一行绿底文字：<strong>"看墨 已在重写时绕开此段"</strong> —— 看心和看墨在同一段稿子上完成了一次跨狐协作</li>
</ol>
<hr>
<h2>Step 8 — 发布到知乎</h2>
<p><strong>做什么</strong>：点击左下角 <strong>发布到知乎 →</strong> 按钮（左下角圆形 · "↗" 箭头样式）</p>
<p><strong>看什么</strong>：</p>
<ul>
<li>模态框预览前 200 字</li>
<li>"圈子选择" 下拉（默认 "医学交流" 圈）</li>
<li>标签建议："胶质母细胞瘤 / 神经外科 / 肿瘤治疗"</li>
<li>底部 AI 标识区：
<ul>
<li><strong>元数据声明</strong>（强制 · 不可取消）：自动写入 Pin 的隐藏 metadata 字段</li>
<li><strong>正文末尾追加 GB 45438-2025 标识</strong>（<strong>可取消的勾选框 · 默认勾选</strong>）：勾选则在正文末追加一行 "本文部分内容由 看山书房 辅助生成 · GB 45438-2025"</li>
</ul>
</li>
</ul>
<p><strong>做什么续</strong>：点 "确认发布"</p>
<ul>
<li>如果你<strong>已用自己的知乎账号登录</strong> → 真实推送一条 Pin 到你的账号</li>
<li>否则 → 演示对话框："演示模式 · 未真实推送到知乎 · pin_id = demo-glioblastoma-001"</li>
</ul>
<hr>
<h2>Step 9 — 结尾：切换到实时模式（可选）</h2>
<p>如果想看完整的实时生成体验：</p>
<ol>
<li>点右下角 <strong>设置</strong> → <strong>实时模式</strong> 开关 → ON</li>
<li>选择 <strong>Kimi</strong>（默认）或 <strong>DeepSeek</strong></li>
<li>填入你的 API key（仅本机保存）</li>
<li>点 "保存并启用"</li>
<li>现在重复 Step 0：对看山说任何 GBM 之外的问题（"帮我写一篇关于阿尔茨海默病的科普"）</li>
<li>这次没有缓存命中 → 你会看到 "正在调用真实模型 · 请稍候 …" 加载状态 → 真实 Kimi / DeepSeek 流式回答</li>
</ol>
<p>切换回缓存模式：实时模式开关 → OFF。</p>
<hr>
<h2>引用列表（粘贴段中的 <code>[N]</code> 对应 · 全部进入看典作为可点击条目）</h2>
<p>[1] <strong>Louis DN, Perry A, Wesseling P, et al.</strong> <em>The 2021 WHO Classification of Tumors of the Central Nervous System: a summary.</em> Neuro-Oncology. 2021;23(8):1231–1251. doi:10.1093/neuonc/noab106. <a href="https://pubmed.ncbi.nlm.nih.gov/34185076/" target="_blank" rel="noopener noreferrer">PubMed 34185076</a></p>
<p>[2] <strong>Stupp R, Mason WP, van den Bent MJ, et al.</strong> <em>Radiotherapy plus concomitant and adjuvant temozolomide for glioblastoma.</em> N Engl J Med. 2005;352(10):987–996. doi:10.1056/NEJMoa043330. <a href="https://pubmed.ncbi.nlm.nih.gov/15758009/" target="_blank" rel="noopener noreferrer">PubMed 15758009</a></p>
<p>[3] <strong>Hegi ME, Diserens AC, Gorlia T, et al.</strong> <em>MGMT gene silencing and benefit from temozolomide in glioblastoma.</em> N Engl J Med. 2005;352(10):997–1003. doi:10.1056/NEJMoa043331. <a href="https://pubmed.ncbi.nlm.nih.gov/15758010/" target="_blank" rel="noopener noreferrer">PubMed 15758010</a></p>
<p>[4] <strong>Stupp R, Taillibert S, Kanner A, et al.</strong> <em>Effect of Tumor-Treating Fields Plus Maintenance Temozolomide vs Maintenance Temozolomide Alone on Survival in Patients With Glioblastoma: A Randomized Clinical Trial.</em> JAMA. 2017;318(23):2306–2316. doi:10.1001/jama.2017.18718. <a href="https://pubmed.ncbi.nlm.nih.gov/29260225/" target="_blank" rel="noopener noreferrer">PubMed 29260225</a></p>
<p>[5] <strong>Reardon DA, Brandes AA, Omuro A, et al.</strong> <em>Effect of Nivolumab vs Bevacizumab in Patients With Recurrent Glioblastoma: The CheckMate 143 Phase 3 Randomized Clinical Trial.</em> JAMA Oncol. 2020;6(7):1003–1010. doi:10.1001/jamaoncol.2020.1024. <a href="https://pubmed.ncbi.nlm.nih.gov/32437507/" target="_blank" rel="noopener noreferrer">PubMed 32437507</a></p>
<p>补充参考（用于看典的"个人笔记"条目，作为顾婉昔自己读过的指南）：</p>
<ul>
<li><strong>Weller M, van den Bent M, Preusser M, et al.</strong> <em>EANO guidelines on the diagnosis and treatment of diffuse gliomas of adulthood.</em> Nat Rev Clin Oncol. 2021;18(3):170–186. doi:10.1038/s41571-020-00447-z. <a href="https://pubmed.ncbi.nlm.nih.gov/33293629/" target="_blank" rel="noopener noreferrer">PubMed 33293629</a></li>
<li><strong>Wen PY, Weller M, Lee EQ, et al.</strong> <em>Glioblastoma in adults: a Society for Neuro-Oncology (SNO) and European Society of Neuro-Oncology (EANO) consensus review on current management and future directions.</em> Neuro-Oncology. 2020;22(8):1073–1113. doi:10.1093/neuonc/noaa106.</li>
</ul>
`.trim();
