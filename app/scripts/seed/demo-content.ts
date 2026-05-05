// Locked demo content. The seed script + the runtime route handlers must
// agree on these strings — runtime cache lookups canonicalize the user's
// inputs against these reference values.

export const DEMO_PARAGRAPH = `影像组学的承诺很大：把影像里非侵入性能拿到的"形状、纹理、密度梯度"特征，去映射到肿瘤的基因表达模式上。理论上，每一次活检都意味着一次手术风险和样本异质性的代价；如果影像能替代——哪怕只是缩小活检靶点——临床收益是实打实的。`;

export const CLIMACTIC_PARAGRAPH = `但承诺不等于路径。当下放射基因组学的瓶颈，不在算法表达力，而在外部验证：模型在自家队列上 AUC 0.92，换一家医院就掉到 0.71；这个差距不是优化器能修的，是数据采集端的标准化没补齐。`;

export const VOICE_BULLETS = `想写一段：放射基因组学离临床还差几步
- 影像组学采集端不统一
- 队列规模太小
- 解释性差`;

export const FOLLOWUP_A = '这一段对外行读者会不会太学术？';
export const FOLLOWUP_B = '如果换成科普 vlog 风格呢？';

export const CUSTOM_MASK_DESCRIPTION = '刚毕业的肿瘤科 PhD';

export const DEMO_USER_ID = 'guwanxi';
