// Initial body HTML for the demo article. Round-trips through:
//   - StarterKit (h1/h2/p/strong/em/blockquote)
//   - InlineMark (span[data-mark-kind])
//   - CitationMark (sup[data-citation-id])
// MarginSeal chits do NOT come from this HTML — they come from
// app/content/seed/margin-seals-demo.json via doc.descendants matching.

export const DEFAULT_DOC_HTML = `
<h1>影像组学的基因组学转向</h1>
<p>2024 年起，影像组学（radiomics）领域出现了一个安静但深刻的转向：从单纯的图像特征提取，转向与基因组学的联合建模。这一转向并非偶然——它反映了一个更基础的问题：<em>影像信号本身能否被理解为基因表达的可视化代理</em>？</p>
<p><span data-mark-kind="ai-touched" data-mark-hint="看墨 · 续写 · 已校验">在过去十年里，影像组学的主流路径是「特征工程 + 机器学习」：从 CT、MRI 中提取数百乃至数千个量化特征（形状、灰度、纹理、小波系数），然后用这些特征训练分类器或回归器，用于诊断、分级、预后预测。</span>这条路径在某些场景下取得了显著成果，但也暴露出三个结构性问题。</p>
<h2>一、可解释性的瓶颈</h2>
<p>第一个问题，是<strong>可解释性</strong>。一个基于 873 个纹理特征训练出的肺癌预后模型，即使在外部验证集上 AUC 达到 0.82，临床医生依然难以信任它——因为没有人能用人话解释，为什么"灰度共生矩阵的逆差矩"和五年生存率相关。</p>
<p><span data-mark-kind="claim" data-mark-hint="医学声明 · 看心建议软化措辞">这种黑盒特性在临床决策场景下是致命的</span>。基因组学的引入，提供了一种可能的解决方案：如果某个影像特征能稳定映射到某条<span data-mark-kind="hedge" data-mark-hint="看心 · 已软化：『某些』而非『全部』">某些</span>已知通路的表达水平（比如缺氧通路、EMT 通路），那么这个特征就有了生物学锚点，模型也就有了可解释性<sup data-citation-id="cite-w-3" data-kind="web" data-cite-label="[3]">[3]</sup><sup data-citation-id="cite-v-7" data-kind="vault" data-cite-label="[v7]">[v7]</sup><sup data-citation-id="cite-z-leng" data-kind="zhihu" data-cite-label="[@冷泉]">[@冷泉]</sup>。</p>
<h2>二、样本量的诅咒</h2>
<p>第二个问题是<strong>样本量</strong>。影像组学通常面对的是高维小样本——几百例患者，几千个特征。常规机器学习方法在这种场景下极易过拟合……</p>
<blockquote>💭 这一段需要例子，可能是 TCIA 上的某个公开数据集？或者引一个具体的论文场景？</blockquote>
<p>……</p>
`.trim();
