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
  {
    id: 'editor',
    title: '选一段文字 · 让看墨重写',
    body: '在编辑器选一句话，按 Ctrl+Shift+M 或右键 → 让看墨润色。GENERIC 和 VOICE 两栏并排出，差别就显出来了。',
    selector: '[data-tour-id="editor"]',
    side: 'top',
  },
  {
    id: 'fox-tails',
    title: '九只狐狸，各管一段',
    body: '想试别的？看文召集 4 种读者，看辩让正反两派吵 6 回合，看典翻你的档案库。点尾巴即可调用。',
    selector: '[data-tour-id="fox-tails"]',
    side: 'right',
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
  {
    id: 'envelope',
    title: '看完了？拆封那只信封',
    body: '右上角的蜡封是九狐之家——一个雪夜的小镇。点开即可进入 lore portal。',
    selector: '[data-tour-id="lore-envelope"]',
    side: 'left',
  },
];
