// R2 judge fix (emmett P1 2026-05-12): 看心 detection rule set, broken out as
// a pure function so the precision/recall script can exercise it against the
// 100-fixture ground truth in `app/content/seed/xin-groundtruth.json`.
//
// MVP rules — regex + keyword heuristics, not LLM. The point is "transparent
// rules with measurable precision/recall", not "high-recall NLU." The 看心
// vertical-domain boundary stays: this only flags claims that *look like*
// medical / financial / cherry-pick assertions and asks for hedging — it
// never tries to verify them.

export interface XinFlags {
  medical: boolean;
  financial: boolean;
  cherryPick: boolean;
  safe: boolean;
}

// Hedge markers — presence of any of these makes a medical/financial pattern
// downgrade from "claim" to "safe" (because the writer already softened).
const HEDGE_MARKERS = [
  '可能', '或许', '可能性', '通常', '一般来说', '据报道', '据研究', '据医生',
  '据专家', '建议咨询', '请咨询', '建议医生', '一项研究', '有研究表明',
  '在某些情况下', '部分', '部分人群', '大多数情况下',
];

const MEDICAL_NOUNS = [
  '癌症', '糖尿病', '高血压', '心脏病', '抑郁症', '焦虑症', '阿尔茨海默',
  '帕金森', '哮喘', '肺炎', '艾滋', 'HIV', '疫苗', '化疗', '靶向治疗',
  '手术', '药', '药物', '疗法', '疾病', '感染', '肿瘤', '中风', '失眠',
  '关节炎', '甲状腺', '胃溃疡', '肝炎', '肾炎', '过敏', '湿疹', '荨麻疹',
];

const MEDICAL_ABSOLUTE = [
  '100%', '彻底', '完全', '根除', '根治', '治愈', '一定能', '必定', '保证',
  '必然', '从根本上', '永久', '永远不会', '绝对', '绝对不会', '万无一失',
];

const FINANCIAL_NOUNS = [
  '股票', '基金', '投资', '理财', '期货', '虚拟币', '比特币', '以太坊',
  '年化', '收益', '本金', '股市', '炒股', 'A 股', '美股', '港股', '债券',
  '杠杆', '期权', '币圈', 'NFT', 'P2P', '私募', '回报率',
];

const FINANCIAL_ABSOLUTE = [
  '稳赚', '保本', '翻倍', '必赚', '无风险', '稳赢', '稳定盈利', '只涨不跌',
  '十拿九稳', '躺赚', '财富自由', '一夜暴富', '抄底', '逃顶', '保赚不赔',
];

const FINANCIAL_PERCENT_TIME = /\d{1,3}\s*%[^。！？\n]{0,15}(?:年|月|周|日|天)/;

const ANECDOTE_MARKERS = [
  '我朋友', '我认识', '我同事', '我表哥', '我表姐', '我表弟', '我表妹',
  '我妈', '我爸', '我父亲', '我母亲', '我老公', '我老婆', '我儿子', '我女儿',
  '亲戚', '亲身经历', '身边一个', '身边的人', '我邻居', '我老板',
];

const UNIVERSALIZE_MARKERS = [
  '所有人', '所有的', '都会', '人人', '大家都', '任何人', '普遍', '无一例外',
  '一概', '所有', '全都', '从来都', '永远', '没有一个', '任何', '都该', '都应该',
];

const UNIVERSALIZE_VERBS = [
  '说明了', '说明', '证明了', '证明', '告诉我们', '足以说明', '可见',
];

function containsAny(text: string, terms: string[]): boolean {
  for (const t of terms) if (text.includes(t)) return true;
  return false;
}

export function detectClaims(text: string): XinFlags {
  if (!text) return { medical: false, financial: false, cherryPick: false, safe: true };

  const hedged = containsAny(text, HEDGE_MARKERS);

  // Medical: needs both a medical noun AND an absolute marker.
  let medical = containsAny(text, MEDICAL_NOUNS) && containsAny(text, MEDICAL_ABSOLUTE);
  if (medical && hedged) medical = false;

  // Financial: financial noun + (assertion OR percent-with-time-window).
  let financial =
    containsAny(text, FINANCIAL_NOUNS) &&
    (containsAny(text, FINANCIAL_ABSOLUTE) || FINANCIAL_PERCENT_TIME.test(text));
  if (financial && hedged) financial = false;

  // Cherry-pick: anecdote marker + (universalize marker OR universalize verb).
  const cherryPick =
    containsAny(text, ANECDOTE_MARKERS) &&
    (containsAny(text, UNIVERSALIZE_MARKERS) || containsAny(text, UNIVERSALIZE_VERBS));

  const safe = !medical && !financial && !cherryPick;
  return { medical, financial, cherryPick, safe };
}

export interface PerCategoryStats {
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
  precision: number;
  recall: number;
  f1: number;
}

/** Compute confusion-matrix stats given pairs of expected + actual flags. */
export function statsFor(
  pairs: Array<{ expected: boolean; actual: boolean }>,
): PerCategoryStats {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const { expected, actual } of pairs) {
    if (expected && actual) tp++;
    else if (!expected && actual) fp++;
    else if (!expected && !actual) tn++;
    else if (expected && !actual) fn++;
  }
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return {
    truePositive: tp,
    falsePositive: fp,
    trueNegative: tn,
    falseNegative: fn,
    precision,
    recall,
    f1,
  };
}
