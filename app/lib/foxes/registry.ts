export type FoxId = 'shan' | 'mo' | 'wen' | 'wen2' | 'shui' | 'dian' | 'shi' | 'jing' | 'xin';

export type FoxVerb = 'orchestrate' | '灵感激发' | '思路梳理' | '内容精加工';

export interface FoxMeta {
  id: FoxId;
  name: string;
  epithet: string;
  role: string;
  species: string;
  persona: string;
  artStyle: string;
  glow: string;
  glowSoft: string;
  ink: string;
  initial: string;
  catchphrase: string;
  tailPath: string;
  tailAsset: string;
  verb: FoxVerb;
  verbSubtitle: string;
  attribution: string | null;
}

export const BODY_ASSET = '/foxes/body.png' as const;

export const FOXES: FoxMeta[] = [
  {
    id: 'shan', name: '刘看山', epithet: '守肆童子',
    role: '编排 · Orchestrator', species: '北极狐', persona: '童子神',
    artStyle: '官方风',
    glow: '#1E3CFF', glowSoft: '#6680FF', ink: '#1A1F2A', initial: '山',
    catchphrase: '让看山想想。',
    tailPath: 'M0,60 C-2,38 -1,18 4,4 C9,-6 18,-9 24,-2 C30,5 28,22 24,40 C20,56 12,66 4,68 Z',
    tailAsset: '/foxes/tail-shan.png',
    verb: 'orchestrate', verbSubtitle: '编排',
    attribution: '刘看山 IP 经知乎黑客松 2026 授权使用',
  },
  {
    id: 'mo', name: '看墨', epithet: '玄狐隐士',
    role: '写作 · Writing', species: '玄狐', persona: '隐士书生',
    artStyle: '水墨写意',
    glow: '#3A4252', glowSoft: '#6B7280', ink: '#1A1F2A', initial: '墨',
    catchphrase: '此处，宜留白。',
    tailPath: 'M0,60 C-4,42 -8,22 -2,8 C4,-4 14,-6 20,2 C28,12 30,28 26,46 C22,60 14,68 6,68 Z',
    tailAsset: '/foxes/tail-mo.png',
    verb: '内容精加工', verbSubtitle: '据档案库语风重写',
    attribution: null,
  },
  {
    id: 'wen', name: '看文', epithet: '赤狐名伶',
    role: '默认人格 · Reader Lens', species: '赤狐', persona: '戏曲名伶',
    artStyle: '工笔重彩',
    glow: '#A8221C', glowSoft: '#D55C53', ink: '#1A1F2A', initial: '文',
    catchphrase: '换一张脸，换一双眼。',
    tailPath: 'M0,60 C2,42 6,28 14,16 C20,8 26,12 24,22 C26,18 32,22 28,32 C32,32 32,42 26,48 C18,58 8,66 2,68 Z',
    tailAsset: '/foxes/tail-wen.png',
    verb: '思路梳理', verbSubtitle: '4 种读者视角并行',
    attribution: null,
  },
  {
    id: 'wen2', name: '看纹', epithet: '赤狐剪纸',
    role: '自定人格 · Custom Lens', species: '赤狐', persona: '剪纸艺人',
    artStyle: '工笔重彩 · 镜像',
    glow: '#6CC0F0', glowSoft: '#A5DBF5', ink: '#1A1F2A', initial: '纹',
    catchphrase: '君心欲剪何形？',
    tailPath: 'M0,60 C-2,42 -6,28 -14,16 C-20,8 -26,12 -24,22 C-26,18 -32,22 -28,32 C-32,32 -32,42 -26,48 C-18,58 -8,66 -2,68 Z',
    tailAsset: '/foxes/tail-wen2.png',
    verb: '思路梳理', verbSubtitle: '自定读者剪一张脸',
    attribution: null,
  },
  {
    id: 'shui', name: '看水', epithet: '耳廓游侠',
    role: '深度研究 · Research', species: '耳廓狐', persona: '游侠考据癖',
    artStyle: '山海经志怪',
    glow: '#2AD9A0', glowSoft: '#76EFC4', ink: '#1A1F2A', initial: '水',
    catchphrase: '此说有据，且看出处。',
    tailPath: 'M0,60 C-3,46 0,32 6,22 C2,18 8,8 14,12 C18,6 24,12 22,20 C28,18 30,28 24,36 C28,40 24,52 16,58 C10,64 4,66 0,68 Z',
    tailAsset: '/foxes/tail-shui.png',
    verb: '灵感激发', verbSubtitle: '深度考据 · 出处可溯',
    attribution: null,
  },
  {
    id: 'dian', name: '看典', epithet: '沙狐管理员',
    role: '档案库 · Vault', species: '沙狐', persona: '民国图书管理员',
    artStyle: '民国月份牌',
    glow: '#B65A5A', glowSoft: '#D08585', ink: '#1A1F2A', initial: '典',
    catchphrase: '记不得者，账上必有。',
    tailPath: 'M0,60 C0,40 4,22 12,12 C18,4 26,6 28,16 C30,26 28,38 24,48 C18,58 10,66 4,68 Z',
    tailAsset: '/foxes/tail-dian.png',
    verb: '灵感激发', verbSubtitle: '档案库 · 让旧作再次发声',
    attribution: null,
  },
  {
    id: 'shi', name: '看势', epithet: '城市赤狐',
    role: '热点 · Trends', species: '城市赤狐', persona: '网瘾社畜',
    artStyle: '赛博霓虹',
    glow: '#D516D5', glowSoft: '#E866E8', ink: '#1A1F2A', initial: '势',
    catchphrase: '这条火了——快看。',
    tailPath: 'M0,60 L4,46 L-2,38 L8,30 L2,22 L12,14 L8,4 L20,6 L24,18 L22,30 L28,40 L20,52 L24,62 L12,64 L8,68 Z',
    tailAsset: '/foxes/tail-shi.png',
    verb: '灵感激发', verbSubtitle: '热榜雷达 · 选题',
    attribution: null,
  },
  {
    id: 'jing', name: '看镜', epithet: '银狐数据师',
    role: '统计 · Analytics', species: '蓝狐', persona: '数据分析师',
    artStyle: '编辑信息图',
    glow: '#0E2A5C', glowSoft: '#4A6190', ink: '#1A1F2A', initial: '镜',
    catchphrase: '凡可量者，皆可解。',
    tailPath: 'M0,60 L0,48 L8,48 L8,36 L18,36 L18,22 L26,22 L26,8 L32,8 L32,68 L0,68 Z',
    tailAsset: '/foxes/tail-jing.png',
    verb: '内容精加工', verbSubtitle: '发布后 · 数据复盘回流',
    attribution: null,
  },
  {
    id: 'xin', name: '看心', epithet: '灰狐守门',
    role: '合规 · Safety', species: '灰狐', persona: '皮影守门人',
    artStyle: '皮影戏',
    glow: '#3AE072', glowSoft: '#82EDA8', ink: '#1A1F2A', initial: '心',
    catchphrase: '此句，不宜出幕。',
    tailPath: 'M0,60 L4,40 L-2,28 L6,18 L0,8 L12,2 L20,10 L18,22 L26,30 L22,42 L28,52 L18,60 L20,68 L4,66 Z',
    tailAsset: '/foxes/tail-xin.png',
    verb: '思路梳理', verbSubtitle: '边界审议 · GB 45438 双标识',
    attribution: null,
  },
];

export const FOX_BY_ID: Record<FoxId, FoxMeta> = Object.fromEntries(
  FOXES.map((f) => [f.id, f])
) as Record<FoxId, FoxMeta>;

export function getFox(id: FoxId): FoxMeta {
  return FOX_BY_ID[id];
}
