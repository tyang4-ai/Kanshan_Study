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
  group: 'workspace' | 'onboarding' | 'titlebar';
}

const pct = (v: number): string => `${Math.round(v * 100)}%`;
const px = (v: number): string => `${Math.round(v)}px`;

export const TWEAK_DEFS: TweakDef[] = [
  // Workspace
  { id: 'workspace.bg.darken',  label: '背景暗化',   group: 'workspace',  min: 0,   max: 1,   step: 0.05, defaultValue: 0.65, format: pct },
  // Onboarding
  { id: 'onboarding.bg.darken', label: '背景暗化',   group: 'onboarding', min: 0,   max: 1,   step: 0.05, defaultValue: 0.55, format: pct },
  // Titlebar
  { id: 'titlebar.avatar.size', label: '头像大小',   group: 'titlebar',   min: 16,  max: 56,  step: 1,    defaultValue: 24,   format: px },
];

export const TWEAK_GROUPS: Record<TweakDef['group'], string> = {
  workspace: '工作台',
  onboarding: '开场',
  titlebar: '顶栏',
};
