import type { FoxId } from '@/lib/foxes/registry';
import { buildCustomMaskPreamble } from '@/lib/foxes/prompts/wen2';

export interface MaskMeta {
  id: string;
  label: string;
  hint: string;
  fox: FoxId;
}

// r5 TASK E (4 judges P1: 徐诗/张荣乐/史中/吴伟): swap from generic-blogger
// masks to GBM-medical masks because the demo doc promises 怀疑型同行/急诊家属/
// 医学生/病人本人 but the product was shipping 路人/业内/社畜/边界.
//
// Both sets are kept; `pickMaskSet(docText)` chooses by content. MEDICAL_MASKS
// is the default because the GBM walkthrough is the canonical demo surface.
//
// Each mask hint carries a triad (POV / 句式 / 禁忌) so 4 outputs at temp=0.7
// don't collapse into "one intern in 4 jackets" (Xiao Tian R3 P1 pattern).
export const MEDICAL_MASKS: MaskMeta[] = [
  {
    id: 'skeptical-peer',
    label: '怀疑型同行',
    hint:
      '另一位脑肿瘤方向研究者读这段——POV：盯证据等级、试验编号、年份是否过时；句式：直接质疑数据来源（"Stupp 2005 都 20 年了，2023 EANO 指南怎么说？"），允许英文 inline（EANO / NCCN / EORTC）；禁忌：不绕弯，不捧场，不接受"普遍认为"这种弱断言。',
    fox: 'wen',
  },
  {
    id: 'family-er',
    label: '急诊家属',
    hint:
      '亲人刚被确诊 GBM、刚走出急诊的家属——POV：只关心"我家人能活多久"和"我们下一步要做什么"；句式：短问句、追问、害怕；禁忌：不用任何缩写或英文术语未解释就出现，不用统计学语言（"中位"、"分位"），不绕弯。',
    fox: 'wen',
  },
  {
    id: 'med-student',
    label: '医学生',
    hint:
      '正在准备规培或专培的医学生——POV：盯定义、机制、临床路径的可执行性；句式：教科书式追问（"具体怎么排放化疗时间表？"、"MGMT 检测首选哪种方法？"），允许引指南章节；禁忌：不闲聊，不抒情，问题要落到具体操作步骤上。',
    fox: 'wen',
  },
  {
    id: 'patient-self',
    label: '病人本人',
    hint:
      '刚确诊、还没开始治疗的患者本人——POV：在害怕和想知道真相之间反复；句式：第一人称，"我"开头，常常是"这些数字让我害怕，能告诉我有没有人活下来吗"这种悖论式追问；禁忌：不要求精确，但要求被看见——任何"理性"的反馈在这里都是冷漠。',
    fox: 'wen',
  },
];

export const LEGACY_MASKS: MaskMeta[] = [
  {
    id: 'passerby',
    label: '路人读者',
    hint:
      '没医学背景，刷到这一段——POV：看完三句话决定是收藏还是划走；句式：口语化，每条点评不超过 2 个分句，允许「啊？」「等等」一类的口头语；禁忌：不用「可解释性」「AUC」一类术语，不引文献。',
    fox: 'wen',
  },
  {
    id: 'expert',
    label: '业内行家',
    hint:
      '影像/统计 PI 视角——POV：挑技术错误 + 看引用是否站得住；句式：允许英文术语 inline（AUC / ROC / dataset），可以指明具体年份和数据集名；禁忌：不用「真厉害」「太对了」一类捧场词，不绕弯。',
    fox: 'wen',
  },
  {
    id: 'whitecollar',
    label: '社畜读者',
    hint:
      '通勤时段刷知乎——POV：最在意 takeaway 能不能 30 秒讲清；句式：一句话 takeaway 开头，然后给出能落地的一两步具体动作；禁忌：不展开理论，不抒情，不夸赞写作本身。',
    fox: 'wen',
  },
  {
    id: 'boundary',
    label: '边界关注者',
    hint:
      '合规/伦理审视——POV：盯医学声明 + AI 替医生说话不行；句式：引用具体条款名或部门名（GB 45438 / 清朗 / NMPA / 二级医院）；禁忌：不带情绪词，不下定罪式判断，只标记需要软化或加 hedge 的具体句子。',
    fox: 'wen',
  },
];

// Default — medical set, because the GBM walkthrough is the canonical demo doc.
export const FIXED_MASKS: MaskMeta[] = MEDICAL_MASKS;

/** Per-doc mask-set selection. Heuristic: if the active doc body contains
 *  any GBM-axis term, return MEDICAL_MASKS; else LEGACY_MASKS. Callers pass
 *  the active document text/HTML. */
const MEDICAL_TERMS_RE = /胶质母细胞瘤|GBM|MGMT|TMZ|替莫唑胺|TTFields|Stupp|IDH|Optune|放化疗|临床试验|术后|预后|生存率/i;
export function pickMaskSet(docText: string | null | undefined): MaskMeta[] {
  if (!docText) return MEDICAL_MASKS;
  return MEDICAL_TERMS_RE.test(docText) ? MEDICAL_MASKS : LEGACY_MASKS;
}

export interface CustomMask {
  id: string;
  label: string;
  description: string;
  fox: 'wen2';
}

// buildCustomMaskPrompt delegates to `lib/foxes/prompts/wen2.ts` so all of
// 看纹's prompt material lives in one place (颜鑫 R3 P1 2026-05-12).
export function buildCustomMaskPrompt(m: CustomMask): string {
  return buildCustomMaskPreamble(m.description);
}

// Debate-mode fixed pair (used by plan #8 — pre-loaded here so plan #8 doesn't touch this file).
export const DEBATE_PAIR = [
  { foxId: 'wen' as FoxId,  mask: '正方 · 力挺',  position: 'pro' as const },
  { foxId: 'wen2' as FoxId, mask: '反方 · 质疑',  position: 'con' as const },
];

export type MaskRef =
  | { kind: 'fixed';  id: string }
  | { kind: 'custom'; mask: CustomMask };

export function resolveMask(ref: MaskRef): MaskMeta | CustomMask | null {
  if (ref.kind === 'fixed') {
    // Search both medical + legacy sets so a maskId resolves regardless of
    // which set is currently active for the doc.
    return (
      MEDICAL_MASKS.find((m) => m.id === ref.id) ??
      LEGACY_MASKS.find((m) => m.id === ref.id) ??
      null
    );
  }
  return ref.mask;
}

export function isCustomMask(m: MaskMeta | CustomMask): m is CustomMask {
  return 'description' in m;
}
