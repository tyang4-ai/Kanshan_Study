import type { FoxId } from '@/lib/foxes/registry';

export interface MaskMeta {
  id: string;
  label: string;
  hint: string;
  fox: FoxId;
}

// Locked decision #6 — these 4 names are the default set.
//
// Content-quality persona-review 2026-05-11 R3 (Xiao Tian) P1: each mask
// hint now carries a triad (POV / 句式 / 禁忌) so 4 outputs at temp=0.7 don't
// collapse into "one intern in 4 jackets." Same pattern as debate.ts PRO/CON
// style differentiation.
export const FIXED_MASKS: MaskMeta[] = [
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

export interface CustomMask {
  id: string;
  label: string;
  description: string;
  fox: 'wen2';
}

export function buildCustomMaskPrompt(m: CustomMask): string {
  return `你是一位读者，描述如下：「${m.description}」。请以这个读者的视角点评本段。`;
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
  if (ref.kind === 'fixed') return FIXED_MASKS.find((m) => m.id === ref.id) ?? null;
  return ref.mask;
}

export function isCustomMask(m: MaskMeta | CustomMask): m is CustomMask {
  return 'description' in m;
}
