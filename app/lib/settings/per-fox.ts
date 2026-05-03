import type { FoxId } from '@/lib/foxes/registry';

export type SettingWidget =
  | { kind: 'toggle'; label: string; hint?: string; defaultOn: boolean; key: string }
  | { kind: 'slider'; label: string; hint?: string; min: number; max: number; value: number; unit?: string; key: string }
  | { kind: 'select'; label: string; hint?: string; options: string[]; value: string; key: string }
  | { kind: 'radio'; label: string; hint?: string; options: string[]; value: string; key: string }
  | { kind: 'chips'; label: string; hint?: string; items: { label: string; on: boolean }[]; key: string }
  | { kind: 'textarea'; label: string; hint?: string; value: string; key: string }
  | { kind: 'button'; label: string; hint?: string; cta: string; action: string }
  | { kind: 'code'; label: string; hint?: string; value: string };

export interface PerFoxSettings {
  groupTitle: string;
  rows: SettingWidget[];
}

export const PER_FOX_SETTINGS: Record<FoxId, PerFoxSettings> = {
  shan: {
    groupTitle: '编排策略',
    rows: [
      { kind: 'toggle', label: '主动召集人格', hint: '检测到争议性段落时，自动召集读者团', defaultOn: true,  key: 'autoCallPersonas' },
      { kind: 'slider', label: '召集阈值',     hint: '争议性评分低于此值时不打扰',         min: 0, max: 100, value: 62, unit: '%', key: 'callThreshold' },
      { kind: 'select', label: '工作时段',     hint: '非工作时段降级为静默模式',           options: ['09:00 — 23:00', '全天', '自定义'], value: '09:00 — 23:00', key: 'workHours' },
      { kind: 'select', label: '默认 LLM',     hint: '所有狐共用，子狐可单独覆写',         options: ['DeepSeek-V3', 'DeepSeek-R1', '本地 · Qwen3-72B'], value: 'DeepSeek-V3', key: 'defaultLLM' },
    ],
  },
  mo: {
    groupTitle: '写作偏好',
    rows: [
      { kind: 'radio',  label: '默认润色风格', hint: '续写、润色时遵循的语气', options: ['知乎专栏', '学术', '随笔', '社畜口语'], value: '知乎专栏', key: 'polishStyle' },
      { kind: 'slider', label: '保留原意 vs 改写自由', min: 0, max: 100, value: 28, unit: '改写%', key: 'rewriteFreedom' },
      { kind: 'slider', label: '续写最大长度', min: 50, max: 2000, value: 300, unit: ' 字', key: 'maxLength' },
      { kind: 'toggle', label: '保留我的不通顺', hint: '不"修正"我故意写的口语化错别字', defaultOn: true, key: 'keepRoughness' },
    ],
  },
  wen: {
    groupTitle: '读者人格预设',
    rows: [
      { kind: 'chips', label: '启用人格', hint: '召集读者团时默认上座的角色', items: [
        { label: '路人读者', on: true },
        { label: '业内行家', on: true },
        { label: '社畜读者', on: true },
        { label: '边界关注者', on: true },
        { label: '海外读者', on: false },
        { label: '同行作者', on: false },
        { label: '杠精',     on: false },
      ], key: 'enabledMasks' },
      { kind: 'radio', label: '评议风格', hint: '读者团整体语气', options: ['犀利', '克制', '温和'], value: '克制', key: 'reviewTone' },
      { kind: 'toggle', label: '自动收纳新人格', hint: '对话中遇到新角色时主动入档', defaultOn: false, key: 'autoArchive' },
    ],
  },
  wen2: {
    groupTitle: '自定人格 · 看纹剪纸',
    rows: [
      { kind: 'select', label: '当前自定模板', hint: '可从模板克隆出新的读者', options: ['我的导师 · Z 教授', '我妈', '知乎评论区平均水平'], value: '我的导师 · Z 教授', key: 'currentTemplate' },
      { kind: 'textarea', label: '人格描述（自由文本）', value: '临床医生，30 年放射科经验。容易被「AI 替代医生」类标题激怒；对数据偏差和样本量很敏感；不接受省略限定语的传播话术。', key: 'description' },
      { kind: 'button', label: '导出此人格', cta: '另存为 .persona', action: 'export' },
    ],
  },
  shui: {
    groupTitle: '深度研究',
    rows: [
      { kind: 'slider', label: '检索深度', hint: '一次研究跑过的文献跳数', min: 1, max: 5, value: 3, unit: ' 跳', key: 'depth' },
      { kind: 'chips', label: '检索源', hint: '排序靠前者优先采纳', items: [
        { label: 'PubMed', on: true },
        { label: 'arXiv', on: true },
        { label: '知乎', on: true },
        { label: '中文期刊', on: true },
        { label: 'Twitter', on: false },
      ], key: 'sources' },
      { kind: 'toggle', label: '后台运行', hint: '正文写作时持续在后台找出处', defaultOn: true, key: 'background' },
      { kind: 'button', label: '低质量来源拉黑', hint: '看心审核的来源黑名单', cta: '查看 · 当前 14 项', action: 'viewBlocklist' },
    ],
  },
  dian: {
    groupTitle: '档案库',
    rows: [
      { kind: 'code',   label: '档案库根目录', value: '~/书房/档案库' },
      { kind: 'select', label: '自动归档', hint: '一篇未编辑超过这个时长后入档', options: ['3 天', '7 天', '30 天'], value: '7 天', key: 'archiveWindow' },
      { kind: 'toggle', label: '未发表草稿可被 AI 引用', defaultOn: false, key: 'includeUnpublished' },
      { kind: 'button', label: '导出全部档案', cta: '打包导出 · 7 卷', action: 'exportAll' },
    ],
  },
  shi: {
    groupTitle: '热点订阅',
    rows: [
      { kind: 'chips', label: '关注领域', items: [
        { label: '医学 AI', on: true },
        { label: '影像组学', on: true },
        { label: '基因组学', on: true },
        { label: '通用 AI', on: false },
        { label: '设计', on: false },
      ], key: 'domains' },
      { kind: 'radio', label: '刷新频率', options: ['每小时', '每 3 小时', '每天'], value: '每 3 小时', key: 'refresh' },
      { kind: 'toggle', label: '只看本周内', defaultOn: true, key: 'thisWeekOnly' },
    ],
  },
  jing: {
    groupTitle: '统计与分析',
    rows: [
      { kind: 'toggle', label: '阅读量回流', defaultOn: true, key: 'readbackFlow' },
      { kind: 'toggle', label: 'A/B 标题对照', defaultOn: false, key: 'abTitles' },
      { kind: 'select', label: '数据保留窗口', options: ['30 天', '90 天', '永久'], value: '90 天', key: 'retention' },
    ],
  },
  xin: {
    groupTitle: '合规与边界',
    rows: [
      { kind: 'radio',  label: '合规等级', options: ['宽松', '常规', '严格'], value: '常规', key: 'level' },
      { kind: 'toggle', label: '医学声明检测', hint: '检测后自动加 InlineMark · 看心标记', defaultOn: true, key: 'medClaimDetect' },
      { kind: 'button', label: '自定义敏感词', hint: '额外纳入审核的关键字', cta: '编辑 · 当前 12 项', action: 'editSensitive' },
      { kind: 'radio',  label: '审议结果可见性', hint: '审议过程是否对其他狐可见', options: ['全部可见', '仅看山', '仅本人'], value: '仅看山', key: 'visibility' },
    ],
  },
};
