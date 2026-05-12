// Phase #16.6 — list of tweakable values surfaced by `?tweak=1`. Adding a
// new entry here makes a new slider appear in the panel; consumers still
// need to call useTweak(id, default) somewhere to actually react to it.

export interface TweakDef {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  format?: (v: number) => string;
  group: 'lore' | 'workspace' | 'onboarding' | 'titlebar';
}

const pct = (v: number): string => `${Math.round(v * 100)}%`;
const mult = (v: number): string => `${v.toFixed(2)}×`;
const px = (v: number): string => `${Math.round(v)}px`;

export const TWEAK_DEFS: TweakDef[] = [
  // Lore portal
  { id: 'lore.hut.scale',       label: '屋舍大小',   group: 'lore',       min: 0.4, max: 2.5, step: 0.05, defaultValue: 1.0,  format: mult },
  { id: 'lore.hut.spread',      label: '屋舍间距',   group: 'lore',       min: 0.5, max: 2.0, step: 0.05, defaultValue: 1.0,  format: mult },
  { id: 'lore.bg.darken',       label: '背景暗化',   group: 'lore',       min: 0,   max: 1,   step: 0.05, defaultValue: 0,    format: pct },
  // Workspace
  { id: 'workspace.bg.darken',  label: '背景暗化',   group: 'workspace',  min: 0,   max: 1,   step: 0.05, defaultValue: 0.65, format: pct },
  // Onboarding
  { id: 'onboarding.bg.darken', label: '背景暗化',   group: 'onboarding', min: 0,   max: 1,   step: 0.05, defaultValue: 0.55, format: pct },
  // Titlebar
  { id: 'titlebar.avatar.size', label: '头像大小',   group: 'titlebar',   min: 16,  max: 56,  step: 1,    defaultValue: 24,   format: px },
];

export const TWEAK_GROUPS: Record<TweakDef['group'], string> = {
  lore: '看山 · 北极小镇',
  workspace: '工作台',
  onboarding: '开场',
  titlebar: '顶栏',
};
