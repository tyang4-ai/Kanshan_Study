import type { FoxId } from '@/lib/foxes/registry';

export interface MaskMeta {
  id: string;
  label: string;
  hint: string;
  fox: FoxId;
}

// Locked decision #6 — these 4 names are the default set.
export const FIXED_MASKS: MaskMeta[] = [
  { id: 'passerby',    label: '路人读者',     hint: '没医学背景，看 5 秒就划走或留下',           fox: 'wen' },
  { id: 'expert',      label: '业内行家',     hint: '挑技术错误，看引用是否站得住',             fox: 'wen' },
  { id: 'whitecollar', label: '社畜读者',     hint: '想要快速结论，最在意 takeaway',            fox: 'wen' },
  { id: 'boundary',    label: '边界关注者',   hint: '盯医学声明，AI 替医生说话不行',            fox: 'wen' },
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
