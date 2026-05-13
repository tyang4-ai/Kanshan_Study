import { chat, type Provider } from '@/lib/llm';
import { DEBATE_PAIR } from '@/lib/personas';
import { DEBATE_PRO_STYLE } from '@/lib/foxes/prompts/wen';
import { DEBATE_CON_STYLE } from '@/lib/foxes/prompts/wen2';

export interface DebateTurn {
  id: string;
  foxId: 'wen' | 'wen2';
  mask: string;
  position: 'pro' | 'con';
  text: string;
  replyToMask?: string;
  agree?: boolean | null;
}

export interface DebateRole {
  id: string;
  label: string;
  description?: string;
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
// Style briefs live with their fox: `lib/foxes/prompts/{wen,wen2}.ts`.
function styleFor(position: 'pro' | 'con'): string {
  return position === 'pro' ? DEBATE_PRO_STYLE : DEBATE_CON_STYLE;
}

export async function* debateStream(
  selection: string,
  turns: number = 6,
  apiKey?: string,
  provider?: Provider,
  proRole?: DebateRole,
  conRole?: DebateRole,
): AsyncGenerator<DebateTurn, void, void> {
  const history: DebateTurn[] = [];
  for (let i = 0; i < turns; i++) {
    const speaker = DEBATE_PAIR[i % 2];
    const opponent = DEBATE_PAIR[(i + 1) % 2];
    const style = styleFor(speaker.position);
    const stance = speaker.position === 'pro' ? '保留这一句' : '删除或重写这一句';
    const opponentLast = history[history.length - 1]?.text ?? '';
    const speakerRole = speaker.position === 'pro' ? proRole : conRole;
    const opponentRole = speaker.position === 'pro' ? conRole : proRole;
    const roleNote = speakerRole
      ? `\n\n【你的人格底色】${speakerRole.label}${speakerRole.description ? `：${speakerRole.description}` : ''}。请让你的论述带上这个视角的偏好与禁忌，但立场仍然是「${stance}」。`
      : '';
    const opponentNote = opponentRole ? `（人格：${opponentRole.label}）` : '';
    const sys =
      i === 0
        ? `你是「${speaker.mask}」${speakerRole ? `，扮演读者人格「${speakerRole.label}」` : ''}。论点对象：「${selection}」。你的立场：${stance}。\n\n${style}${roleNote}\n\n给出 60—100 字的论述，引用原文具体片段做支撑。`
        : `你是「${speaker.mask}」${speakerRole ? `，扮演读者人格「${speakerRole.label}」` : ''}。回应对手「${opponent.mask}」${opponentNote}上一回合：「${opponentLast}」。\n\n${style}${roleNote}\n\n继续论证你的立场（${speaker.position === 'pro' ? '保留' : '删除/重写'}「${selection}」）。咬住对方上一回合的具体一个表达去反驳，不要泛泛而谈。60—100 字。`;
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
