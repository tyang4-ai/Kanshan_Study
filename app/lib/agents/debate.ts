import { chat, type Provider } from '@/lib/llm';
import { DEBATE_PAIR } from '@/lib/personas';

export interface DebateTurn {
  id: string;
  foxId: 'wen' | 'wen2';
  mask: string;
  position: 'pro' | 'con';
  text: string;
  replyToMask?: string;
  agree?: boolean | null;
}

export const DEBATE_FALLBACK: DebateTurn[] = [
  {
    id: 'fb-debate-1',
    foxId: 'wen',
    mask: '正方 · 力挺',
    position: 'pro',
    text: '此句是全文最有力的钩子。删掉它，整段就只剩工具批评，没有立场。保留——情绪是科普类内容的承重墙。',
  },
  {
    id: 'fb-debate-2',
    foxId: 'wen2',
    mask: '反方 · 质疑',
    position: 'con',
    text: '反对。情绪不是承重墙，是装饰墙——拆了房子还在。换成数据陈述（如 "78% 临床医生认为其不可解释"）一样有力，且更经得起推敲。',
    replyToMask: '正方 · 力挺',
    agree: false,
  },
];

// Per-position rhetorical brief — keeps 正方 and 反方 from collapsing into
// "two voices of the same LLM." Each side has a distinct argumentation
// method, distinct sentence-shape, and distinct anti-pattern (content-quality
// persona-review 2026-05-11 flagged the original prompt as "argument volley
// vs real debate" — same voice on both sides).
const PRO_STYLE = [
  '【你的立论方法】先承认对方可能成立的弱版本，再立刻提出一个对手没想到的具体场景，把保留这一句的代价亮出来。从"如果删了会失去什么"这一边切入，不要从"为什么应该保留"这一边切入。',
  '【你的句式】短切句开头，紧跟一个有具体细节的长句。一段话不超过 3 个分句。绝不使用并排比、绝不"首先...其次"、绝不"我们必须承认"。',
  '【你的禁忌】不得说「这一句感人/有温度/打动人」一类空话——你只谈结构性后果（"删了之后，第二段的转折就没了铺垫"）。',
].join('\n');
const CON_STYLE = [
  '【你的立论方法】用一个反例直接打掉对方论点。先复述对方关键 claim 的最有力版本（steel-man），然后用一个具体替代写法证明它的功能可以转移。不要说"删掉"——要说"换成什么"。',
  '【你的句式】用问句切入开篇。第二句给出具体替代。第三句承认这个替代有什么代价。三句话内闭合。',
  '【你的禁忌】不得说「这种写法不专业/有 AI 味/太情绪化」——这些是品味词。你只用"功能可被替代"或"读者会卡在哪里"这种结构论证。',
].join('\n');

function styleFor(position: 'pro' | 'con'): string {
  return position === 'pro' ? PRO_STYLE : CON_STYLE;
}

export async function* debateStream(
  selection: string,
  turns: number = 6,
  apiKey?: string,
  provider?: Provider,
): AsyncGenerator<DebateTurn, void, void> {
  const history: DebateTurn[] = [];
  for (let i = 0; i < turns; i++) {
    const speaker = DEBATE_PAIR[i % 2];
    const opponent = DEBATE_PAIR[(i + 1) % 2];
    const style = styleFor(speaker.position);
    const stance = speaker.position === 'pro' ? '保留这一句' : '删除或重写这一句';
    const opponentLast = history[history.length - 1]?.text ?? '';
    const sys =
      i === 0
        ? `你是「${speaker.mask}」。论点对象：「${selection}」。你的立场：${stance}。\n\n${style}\n\n给出 60—100 字的论述，引用原文具体片段做支撑。`
        : `你是「${speaker.mask}」。回应对手「${opponent.mask}」上一回合：「${opponentLast}」。\n\n${style}\n\n继续论证你的立场（${speaker.position === 'pro' ? '保留' : '删除/重写'}「${selection}」）。咬住对方上一回合的具体一个表达去反驳，不要泛泛而谈。60—100 字。`;
    const text = await chat(
      [
        { role: 'system', content: sys },
        { role: 'user', content: '请回复' },
      ],
      // Sun Wei R2 P1 2026-05-11: maxTokens=400 against a 60-100 字 prompt
      // gave 150-200 字 outputs (LLM fills its budget). Drop to 220 so the
      // bubble stays compact and the script's 30s / 6-turn pace works.
      { temperature: 0.75, maxTokens: 220, apiKey, provider },
    );
    const turn: DebateTurn = {
      id: crypto.randomUUID(),
      foxId: speaker.foxId as 'wen' | 'wen2',
      mask: speaker.mask,
      position: speaker.position,
      text,
      replyToMask: i > 0 ? opponent.mask : undefined,
      agree: i > 0 ? false : undefined,
    };
    history.push(turn);
    yield turn;
  }
}
