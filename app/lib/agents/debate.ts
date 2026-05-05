import { chat } from '@/lib/llm/deepseek';
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

export async function* debateStream(
  selection: string,
  turns: number = 6,
  apiKey?: string,
): AsyncGenerator<DebateTurn, void, void> {
  const history: DebateTurn[] = [];
  for (let i = 0; i < turns; i++) {
    const speaker = DEBATE_PAIR[i % 2];
    const opponent = DEBATE_PAIR[(i + 1) % 2];
    const sys =
      i === 0
        ? `你是「${speaker.mask}」。论点对象：「${selection}」。你的立场：${speaker.position === 'pro' ? '保留这一句' : '删除或重写这一句'}。给出 60—100 字的论述，引用原文细节做支撑。`
        : `你是「${speaker.mask}」。回应对手「${opponent.mask}」上一回合：「${history[history.length - 1].text}」。继续论证你的立场（${speaker.position === 'pro' ? '保留' : '删除/重写'}「${selection}」）。给出 60—100 字。`;
    const text = await chat(
      [
        { role: 'system', content: sys },
        { role: 'user', content: '请回复' },
      ],
      { temperature: 0.85, maxTokens: 400, apiKey },
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
