export interface TourStep {
  id: string;
  title: string;
  body: string;
  selector: string;
  side: 'top' | 'bottom' | 'left' | 'right';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'left-rail',
    title: '档案库 · 灵感激发',
    body: '左轨是你的档案库。鼠标悬停展开；钉到 corkboard 的笔记会同步到编辑器。',
    selector: '[data-tour-id="left-rail"]',
    side: 'right',
  },
  {
    id: 'editor',
    title: '写作面 · 内容精加工',
    body: '中央 TipTap 编辑器。右键唤出菜单，可调用 看墨 重写、看文 点评、看心 审议。',
    selector: '[data-tour-id="editor"]',
    side: 'top',
  },
  {
    id: 'floating',
    title: '浮动窗口',
    body: '所有面板共享一个可拖动浮窗：档案、热榜、统计、设置、人格、辩论、考据。',
    selector: '[data-tour-id="floating-window"]',
    side: 'left',
  },
  {
    id: 'fox-tails',
    title: '九尾',
    body: '默认激活的是 看墨。点击其他狐尾切换；多选可同时启用。',
    selector: '[data-tour-id="fox-tails"]',
    side: 'right',
  },
  {
    id: 'envelope',
    title: '北极小镇',
    body: '右上角的蜡封信封会进入九狐之家——本项目的 lore portal。',
    selector: '[data-tour-id="lore-envelope"]',
    side: 'left',
  },
  {
    id: 'settings',
    title: '设置 · 你的密钥',
    body: '在设置面板可填入你自己的 DeepSeek 密钥,解除受限模式。',
    selector: '[data-tour-id="settings-button"]',
    side: 'right',
  },
  {
    id: 'stats',
    title: '统计 · 看镜',
    body: '看镜 在发布之后回流统计，闭合工作流。',
    selector: '[data-tour-id="stats-button"]',
    side: 'right',
  },
  {
    id: 'lore-final',
    title: '想了解更多技术细节？',
    body: '点开右上角的信封 → 进入 北极小镇 → 镇尾的告示牌。',
    selector: '[data-tour-id="lore-envelope"]',
    side: 'left',
  },
];
