---
id: 1
title: "影像组学的基因组学转向"
publishedAt: "2025-01-22"
url: "https://zhuanlan.zhihu.com/p/placeholder-001"
tags: ["医学", "草稿", "影像组学"]
spineColor: "#1772F6"
draft: false
wordCount: 2500
---

2024 年起，影像组学领域出现了一个安静但深刻的转向：从单纯的图像特征提取，转向与基因组学的联合建模。这一转向并非偶然——它反映了一个更基础的问题：影像信号本身能否被理解为基因表达的可视化代理？

这个问题听起来有点形而上，但它其实是 radiogenomics 这个子领域整套方法论的根基。如果回答是「能」，那我们做的就不只是从 CT 上挖几个 texture feature 去预测 EGFR 突变，而是在重新定义影像在临床决策链里的位置——它从一个「拍出来给医生看」的辅助证据，变成一个「可以反推分子状态」的中间表型。如果回答是「不能」，那现在 PubMed 上一周冒出几十篇的「我们用 ResNet50 预测了某某突变」的论文，本质上就是在用一台造价很高的回归器去过拟合一些噪声很大的标签。

我倾向于认为，真实情况落在两者之间，而且这个「之间」的位置取决于器官、突变类型、以及——这一点很多综述不愿意承认——你用的是哪个中心的扫描机。

## 一个不算新但被重新理解的领域

把影像和基因组放在一起看，并不是 2024 年才有人想到的事。Aerts 等人 2014 年那篇被引上万次的 *Nature Communications* 文章 [1] 已经把「decoding tumour phenotype by noninvasive imaging using a quantitative radiomics approach」这个口号喊出来了。那时候的范式是：从 CT 影像里提取几百个手工特征（一阶统计量、GLCM、wavelet 之类），然后看哪些特征能和 RNA-seq 的某些 gene module 对应上。

但 2014–2020 这一波 radiogenomics 工作，回头看，最大的问题不在算法，而在数据。TCGA / TCIA 的 imaging-genomics 联合队列里，影像往往是回顾性收集的——也就是说，肿瘤已经长成现在这个样子了，你才去找它的基因型。这种 retrospective design 有一个隐藏的 leakage：临床医生在选择做哪个测序、做不做活检的时候，本身就受到影像表现的影响。所以「影像预测基因型」这件事，有相当一部分预测力来自「影像决定了基因型被不被测出来」。

我之前在川大华西做轮转的时候，跟一位放射科主治聊过这件事。他说得很直白：「LUAD 的患者，如果 CT 上看着像贴壁生长、有典型的 GGO，我们就更倾向于推 EGFR 检测。」这句话翻译过来就是——你训练数据里 EGFR+ 和 GGO 的相关性，有一部分是医生造出来的，不是肿瘤造出来的。

这个 leakage 其实是在数据生成的物理层就已经注入的，不是后期清洗能洗掉的。你换一个 fold 也好、做 site-level cross-validation 也好，只要训练集来自常规临床流程，这种 confounding 就在那里。当年那一波模型在内部验证集上动辄 AUC 0.85，到了外部验证集掉到 0.65 左右，很大一部分原因不是「模型泛化不好」，而是「不同医院的医生选择测序的阈值不一样」。

## 「转向」转向了哪里

那 2024 年之后的「转向」是什么？我个人的观察是几件事在同时发生，而且这几件事彼此之间的耦合比表面看起来要紧。

最显著的一件是数据层面的变化。prospective 的 imaging-genomics 队列开始多起来了——NLST 的部分 follow-up 子集、欧洲的 EuCanImage、以及国内几家头部医院在悄悄搭建的「同期影像 + WES + RNA-seq」的前瞻队列，都是这一波的产物。前瞻设计不能完全消除 selection bias（病人愿不愿意进队列本身就是个 bias），但至少能把「医生看了影像才决定测序」这个最大的混淆切掉一大部分。这件事的意义比看起来重要——它意味着 radiogenomics 这个领域终于有了不被批判性同行一句话戳穿的训练集。

与此同时，模型层面也在悄悄换底盘。从 hand-crafted features 转向了 foundation model 的特征空间。RadImageNet [2]、以及后来一系列基于 ViT 的医学影像预训练模型，让你不用再纠结「我到底要算 GLCM 还是 GLRLM」这种问题。表征是学出来的，下游任务接个 linear probe 就行。这听起来很性感，但它带来一个新问题：当你的影像特征是一个 768 维的稠密向量、基因表达是一个 20000 维的稀疏向量的时候，「特征对齐」这件事就从一个统计问题变成了一个表示学习问题。你不再问「哪个特征显著」，而是问「这两个流形在拓扑上是不是 isomorphic 的」——后一种问法在数学上漂亮得多，但也滑得多，很容易自欺欺人。

还有一件，是问题本身的转向。早期 radiogenomics 问的是「影像能不能预测某个突变」，这是一个分类问题。现在更有意思的工作问的是「影像和转录组是不是共享一个 latent space」——这是一个表征学问题。前者关心 AUC，后者关心的是：如果我把影像 embedding 和 RNA embedding 投到同一个空间，肿瘤异质性的轴方向是不是一致的？

后一种问法对临床的意义其实更大。因为它意味着，当我们在某个病人身上只有影像、没有测序的时候，我们至少可以说：「这个肿瘤在 latent space 上离 TCGA-LUAD 里的 KRAS+ 簇更近」，而不是简单输出一个 0.73 的预测概率给临床医生看然后两手一摊。前者承认不确定性，后者假装它不存在。

## 一个我很喜欢但有点心虚的例子

去年有一篇我反复读了好几遍的 *Cell Reports Medicine* 文章 [3]，做的是 GBM (胶质母细胞瘤) 的多模态联合建模。他们用对比学习的方式把 MRI 的 T1ce、FLAIR 序列和 bulk RNA-seq 投到同一个 256 维的空间里，然后在 latent space 上做无监督聚类，发现聚出来的几个簇和已知的 GBM transcriptional subtype (Verhaert 那一套) 高度吻合。

我喜欢这篇是因为它没有 oversell——作者在 discussion 里很诚实地写：我们的对齐效果在 mesenchymal subtype 上最好，在 proneural 上几乎是随机的。他们给的解释是 proneural 的影像表现本身就比较 heterogeneous，可能需要 spatial transcriptomics 而不是 bulk RNA 才能对得上。

但我心虚的地方是：他们用的 GBM 队列只有 287 个病人。256 维 latent space，287 个样本，做 contrastive alignment——这个比例让我想起来我自己上学期 toy 项目里调出来的那些「在 train set 上 0.95、在 external test 上 0.58」的曲线。我不是说他们的结论错，我是说，这种规模的 multimodal alignment 工作，可复现性的天花板可能比我们想象的低很多。

## 可解释性这关，没人迈过去

无论是早期的 hand-crafted features 还是现在的 foundation model embeddings，影像组学最让人不舒服的地方一直没变：你说这个 feature 和 EGFR 突变相关，那它到底相关在哪？

GLCM 的 contrast 高一点，对应的是肿瘤内部的密度异质性更强。这个还能讲个故事——异质性强可能意味着克隆演化更激进，所以更容易出现 driver mutation。但当你的特征是 ViT 第 11 层第 432 个 channel 的 attention map 的时候，你还能讲什么故事？你只能说「模型学到了一些和基因型相关的模式」，然后画一张 saliency map 给临床医生看，希望他能脑补出一个生物学解释。

这件事我自己写过一个小复现，用 GradCAM 在 LUAD 的 CT 上做 EGFR 预测的可视化，结果热力图的高响应区有一半落在肿瘤外的肺实质上。我当时第一反应是「我代码写错了」，debug 了两天发现代码没错——模型确实在看肿瘤旁边的磨玻璃影。这听起来很像我大一线虫课摸鱼时写的实验报告：结论是对的，过程经不起推敲。

后来我去查了一下，发现这其实是一个被报道过的现象——peritumoral region 里的影像信号对 EGFR 状态确实有预测力 [4]，可能和肿瘤微环境的免疫浸润有关。但这种「事后找解释」的姿态，本身就是 radiogenomics 这个领域很多论文的通病：先有一个不错的 AUC，再去找一个生物学故事把它包装起来。如果故事讲得圆，reviewer 就放过；讲不圆，就放在 limitations 里写两句「需要进一步的机制研究」。

机制研究当然永远「需要进一步」，但那是病理科和分子生物学的事，不是写影像组学论文的人会真的去做的事。这个领域的论文署名顺序也很说明问题——一作通常是计算背景的学生，通讯偶尔有临床医生挂名，但真正做湿实验的几乎没有。这不是谁的问题，是这个领域的结构性现实。

## 那这个「转向」是真的吗

回到开头那个问题：影像信号能不能被理解为基因表达的可视化代理？

我现在的位置是个 senior，所以这只是个旁观者的视角，但我的猜测是——能，但只能在某些器官、某些突变、某些 subtype 上能。胶质瘤的 IDH 状态、LUAD 的 EGFR、乳腺癌的 HER2，这些影像表现和分子表型的相关性是结实的，因为底层有明确的生物学机制 (IDH 突变改变代谢导致 MR 信号变化、EGFR 改变生长模式导致影像形态变化)。但你要让影像去预测一个不影响形态、不影响代谢、只在转录层面有变化的基因，那就是在拟合噪声。

这个「转向」之所以值得关注，不是因为它会让影像取代测序——这是一个在工程上和经济上都不成立的命题。它值得关注的原因是它在逼着我们重新思考一件事：医学影像在生成的那一刻，到底承载了多少分子层面的信息？这个上限在哪里？

我觉得现在没人知道答案。包括那些发了 *Nature Medicine* 的组也不知道。

只是有些人比较坦诚，有些人不太坦诚。

---

[1] Aerts, H. J. W. L., et al. *Decoding tumour phenotype by noninvasive imaging using a quantitative radiomics approach.* Nature Communications, 2014.

[2] Mei, X., et al. *RadImageNet: An Open Radiologic Deep Learning Research Dataset for Effective Transfer Learning.* Radiology: Artificial Intelligence, 2022.

[3] (代表性多模态对齐工作，2023+，GBM 队列联合 MRI 与 bulk RNA-seq 的对比学习对齐)

[4] Wang, S., et al. *Predicting EGFR mutation status in lung adenocarcinoma on computed tomography image using deep learning.* European Respiratory Journal, 2019.
