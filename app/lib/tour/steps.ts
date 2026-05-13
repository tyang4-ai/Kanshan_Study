export interface TourStep {
  id: string;
  title: string;
  body: string;
  selector: string;
  side: 'top' | 'bottom' | 'left' | 'right';
}

// 5-step action-led first-paint tour (persona-review 2026-05-10 小李 P1: the
// previous 8-step concept-led tour was too long for clickthrough orientation).
// Steps lead with what to CLICK, not what to KNOW. Settings + stats moved
// out — they auto-introduce when the user opens them.
export const TOUR_STEPS: TourStep[] = [
  // Y8-P1c (2026-05-11): introduce the cast BEFORE the verb-action. Sun
  // Yulin's casual review showed Step 1 mentioning "看墨" before any of
  // the 9 foxes had been introduced — confusing for first-touch users.
  {
    id: 'fox-tails',
    title: '九只狐狸 · 都在右栏',
    body: '右栏一列按钮就是 9 只狐狸：看墨润色、看文召集 4 种读者、看辩让正反两派开吵、看水查证、看典翻档案、看势看热榜、看镜看数据、看心审合规。点对应按钮即可差遣。',
    selector: '[data-tour-id="fox-tails"]',
    side: 'left',
  },
  // Y8-P0b (2026-05-11): the editor pre-loads with the demo article on cold
  // start (intentional — prioritizes demo density over blank-slate onboarding).
  // The tour card calls this out so casual users know they can wipe it.
  {
    id: 'editor',
    title: '选一段文字 · 让看墨重写',
    body: '在编辑器选一句话，按 Ctrl+Shift+M 或右键 → 让看墨润色。GENERIC 和 VOICE 两栏并排出，差别就显出来了。（左边的稿件是演示用 — 看完 demo 后随时可以全选删掉，从空白开始写自己的。）',
    selector: '[data-tour-id="editor"]',
    side: 'top',
  },
  {
    id: 'left-rail',
    title: '档案库就是你的语风库',
    body: '你写过的旧文都在左轨这里。看墨重写时会从档案里取段落——所以稿子越积，AI 越像你。',
    selector: '[data-tour-id="left-rail"]',
    side: 'right',
  },
  {
    id: 'profile-chip',
    title: '想看完整 demo？切到 顾婉昔',
    body: '右上角点「我 → 顾婉昔」可切换到演示账号，那里档案库已经填好，整套流程一遍走完。',
    selector: '[data-tour-id="profile-chip"]',
    side: 'bottom',
  },
];
