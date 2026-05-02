import { Jieba } from '@node-rs/jieba';
import { dict } from '@node-rs/jieba/dict';

export type OpeningKind =
  | 'rhetoricalQuestion'
  | 'firstPersonAnecdote'
  | 'specificFact'
  | 'generalClaim'
  | 'enumeration'
  | 'other';

export type VoiceFeatures = {
  avgSentenceLength: number;
  sentenceLengthCV: number;
  idiomDensity: number;
  genericFunctionWordRate: number;
  rhetoricalQuestionRate: number;
  paragraphLengthCV: number;
  openingDistribution: Record<OpeningKind, number>;
  citationDensity: number;
  charCount: number;
  sentenceCount: number;
};

export type ArticleInput = { id: string; body: string };

const KNOWN_IDIOMS: ReadonlySet<string> = new Set([
  '事半功倍', '众所周知', '一举两得', '一目了然', '举一反三', '深思熟虑',
  '井井有条', '得心应手', '潜移默化', '锦上添花', '不可避免', '一以贯之',
  '言简意赅', '未雨绸缪', '锲而不舍', '一蹴而就', '因地制宜', '一针见血',
  '归根结底', '不约而同', '总而言之', '由此可见', '百花齐放', '迎刃而解',
  '举足轻重', '源远流长', '一脉相承', '无独有偶', '如出一辙', '屡见不鲜',
  '不胜枚举', '司空见惯', '不言而喻', '理所当然', '脱颖而出', '毋庸置疑',
  '毋庸赘言', '显而易见', '无可厚非', '见仁见智', '众说纷纭', '莫衷一是',
  '众口难调', '各执一词', '针锋相对', '南辕北辙', '背道而驰', '殊途同归',
  '如此而已', '不过如此', '仅此而已', '无非如此', '如此之多', '数不胜数',
  '层出不穷', '比比皆是', '不可胜数', '举不胜举', '鳞次栉比', '门庭若市',
  '络绎不绝', '纷至沓来', '蜂拥而至', '画蛇添足', '亡羊补牢', '塞翁失马',
  '杞人忧天', '叶公好龙', '守株待兔', '掩耳盗铃', '滥竽充数', '邯郸学步',
  '画龙点睛', '对牛弹琴', '刻舟求剑', '入木三分', '青出于蓝',
  '水到渠成', '顺理成章', '有的放矢', '一举多得', '独树一帜',
]);

const GENERIC_FUNCTION_WORD_RE =
  /(首先|其次|再次|最后|综上所述|众所周知|随着.{0,8}发展|综上来看|总而言之|不可否认|毋庸置疑)/g;

const CITATION_RE = /(\[\d+\]|\[v\d+\]|\[@[^\]]+\]|\([A-Za-z][\w-]*\s+\d{4}\))/g;

export function splitSentences(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  let buf = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    buf += ch;
    if (ch === '。' || ch === '！' || ch === '？') {
      out.push(buf);
      buf = '';
      continue;
    }
    if (ch === '.' || ch === '!' || ch === '?') {
      const next = text[i + 1];
      if (next === undefined || /\s/.test(next)) {
        out.push(buf);
        buf = '';
      }
    }
  }
  if (buf.length > 0) out.push(buf);
  return out.map((s) => s.trim()).filter((s) => s.length > 0);
}

export function avgSentenceLength(sentences: string[]): number {
  if (sentences.length === 0) return 0;
  const total = sentences.reduce((acc, s) => acc + s.length, 0);
  return total / sentences.length;
}

function populationCV(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / values.length;
  return Math.sqrt(variance) / mean;
}

export function sentenceLengthCV(sentences: string[]): number {
  return populationCV(sentences.map((s) => s.length));
}

export function paragraphLengthCV(paragraphs: string[]): number {
  const lens = paragraphs
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => p.length);
  return populationCV(lens);
}

function isFourHanChars(s: string): boolean {
  if (s.length !== 4) return false;
  for (let i = 0; i < 4; i++) {
    const code = s.charCodeAt(i);
    if (code < 0x4e00 || code > 0x9fff) return false;
  }
  return true;
}

export function idiomDensity(text: string, jieba: Jieba): number {
  if (!text) return 0;
  const tokens = jieba.cut(text);
  let count = 0;
  for (const t of tokens) {
    if (isFourHanChars(t) && KNOWN_IDIOMS.has(t)) count++;
  }
  return (count / text.length) * 1000;
}

export function genericFunctionWordRate(text: string): number {
  if (!text) return 0;
  const matches = text.match(GENERIC_FUNCTION_WORD_RE);
  const count = matches ? matches.length : 0;
  return (count / text.length) * 1000;
}

export function rhetoricalQuestionRate(text: string): number {
  if (!text) return 0;
  let count = 0;
  for (const ch of text) if (ch === '？') count++;
  return (count / text.length) * 1000;
}

export function citationDensity(text: string): number {
  if (!text) return 0;
  const matches = text.match(CITATION_RE);
  const count = matches ? matches.length : 0;
  return (count / text.length) * 1000;
}

const FIRST_PERSON_VERBS = ['做', '读', '见', '写', '想', '记得', '曾', '听', '试', '学', '碰到', '遇到'];
const SPECIFIC_FACT_RE = /\d+\s*(年|月|日|个|篇|次|百分比|%|万|亿|位|位数|kb|mb|gb|nm|kg|GB|TB)/i;

export function classifyOpening(firstSentence: string): OpeningKind {
  const s = firstSentence.trim();
  if (!s) return 'other';

  if (s.endsWith('？')) return 'rhetoricalQuestion';

  if (s.startsWith('我')) {
    const window = s.slice(1, 6);
    for (const v of FIRST_PERSON_VERBS) {
      const idx = window.indexOf(v);
      if (idx !== -1 && idx <= 4) return 'firstPersonAnecdote';
    }
  }

  if (/\d/.test(s) && SPECIFIC_FACT_RE.test(s)) return 'specificFact';

  if (s.startsWith('首先') || s.startsWith('第一') || s.startsWith('一来')) {
    return 'enumeration';
  }

  if (s.startsWith('众所周知') || s.startsWith('随着')) return 'generalClaim';

  return 'other';
}

export function extractFeatures(articles: ArticleInput[], jieba: Jieba): VoiceFeatures {
  const joined = articles.map((a) => a.body).join('\n\n');
  const sentences = splitSentences(joined);
  const paragraphs = joined.split(/\n\s*\n+/);

  const dist: Record<OpeningKind, number> = {
    rhetoricalQuestion: 0,
    firstPersonAnecdote: 0,
    specificFact: 0,
    generalClaim: 0,
    enumeration: 0,
    other: 0,
  };
  if (articles.length > 0) {
    for (const a of articles) {
      const first = splitSentences(a.body)[0] ?? '';
      dist[classifyOpening(first)]++;
    }
    for (const k of Object.keys(dist) as OpeningKind[]) {
      dist[k] = dist[k] / articles.length;
    }
  }

  return {
    avgSentenceLength: avgSentenceLength(sentences),
    sentenceLengthCV: sentenceLengthCV(sentences),
    idiomDensity: idiomDensity(joined, jieba),
    genericFunctionWordRate: genericFunctionWordRate(joined),
    rhetoricalQuestionRate: rhetoricalQuestionRate(joined),
    paragraphLengthCV: paragraphLengthCV(paragraphs),
    openingDistribution: dist,
    citationDensity: citationDensity(joined),
    charCount: joined.length,
    sentenceCount: sentences.length,
  };
}

export function createJieba(): Jieba {
  return Jieba.withDict(dict);
}
