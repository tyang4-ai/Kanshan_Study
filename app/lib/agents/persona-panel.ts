import { chatJson } from '@/lib/llm/deepseek';
import {
  type MaskMeta,
  type CustomMask,
  buildCustomMaskPrompt,
  isCustomMask,
} from '@/lib/personas';

export type SelectedMask = MaskMeta | CustomMask;

export interface PersonaMessage {
  id: string;
  round: 1 | 2 | 3;
  foxId: string;
  mask: string;
  text: string;
  tags: string[];
  replyToMask?: string;
  agree?: boolean | null;
  time?: string;
}

interface Round1Json {
  text: string;
  tags: string[];
}

interface RoundNJson {
  text?: string;
  tags?: string[];
  replyToMask?: string;
  agree?: boolean | null;
  skip?: boolean;
}

interface RoutingJson {
  chosenMaskLabel: string;
  why: string;
}

const JSON_TAIL_R1 =
  '同时给出 1–3 个标签。返回严格 JSON {"text": "...", "tags": ["...", "..."]}';

function maskFoxId(m: SelectedMask): string {
  return isCustomMask(m) ? 'wen2' : m.fox;
}

function round1System(m: SelectedMask): string {
  if (isCustomMask(m)) {
    return `${buildCustomMaskPrompt(m)} 请用第一人称，60–120 字，给出对所给段落最直接的反应（情绪 + 判断 + 行动）。${JSON_TAIL_R1}`;
  }
  return `你是一位「${m.label}」读者：${m.hint}。请用第一人称，60–120 字，给出对所给段落最直接的反应（情绪 + 判断 + 行动）。${JSON_TAIL_R1}`;
}

function roundNSystem(m: SelectedMask, history: PersonaMessage[]): string {
  const historySerialized = history.map((h) => `「${h.mask}」: ${h.text}`).join('\n');
  return `你仍是「${m.label}」读者。以下是其他读者的发言：\n${historySerialized}\n请你针对其中**一条**给出 40–80 字的回应：附议、不同意、或追问。返回严格 JSON {"text": "...", "tags": [...], "replyToMask": "其他读者的面具名", "agree": true|false|null, "skip": false}。如果你认为没有需要补充的，返回 {"skip": true}。`;
}

export async function runRound1(
  selection: string,
  masks: SelectedMask[],
  apiKey?: string
): Promise<PersonaMessage[]> {
  const results = await Promise.all(
    masks.map(async (m) => {
      const json = await chatJson<Round1Json>(
        [
          { role: 'system', content: round1System(m) },
          { role: 'user', content: selection },
        ],
        { model: 'deepseek-chat', temperature: 0.7, apiKey }
      );
      const msg: PersonaMessage = {
        id: crypto.randomUUID(),
        round: 1,
        foxId: maskFoxId(m),
        mask: m.label,
        text: json.text,
        tags: Array.isArray(json.tags) ? json.tags : [],
      };
      return msg;
    })
  );
  return results;
}

export async function runRoundN(
  selection: string,
  masks: SelectedMask[],
  history: PersonaMessage[],
  roundIdx: 2 | 3,
  apiKey?: string
): Promise<PersonaMessage[]> {
  const out: PersonaMessage[] = [];
  for (const m of masks) {
    const json = await chatJson<RoundNJson>(
      [
        { role: 'system', content: roundNSystem(m, history) },
        { role: 'user', content: selection },
      ],
      { model: 'deepseek-chat', temperature: 0.7, apiKey }
    );
    if (json.skip) continue;
    const msg: PersonaMessage = {
      id: crypto.randomUUID(),
      round: roundIdx,
      foxId: maskFoxId(m),
      mask: m.label,
      text: json.text ?? '',
      tags: Array.isArray(json.tags) ? json.tags : [],
      replyToMask: json.replyToMask,
      agree: json.agree === undefined ? undefined : json.agree,
    };
    out.push(msg);
  }
  return out;
}

export async function routeFollowup(
  history: PersonaMessage[],
  userMessage: string,
  masks: SelectedMask[],
  apiKey?: string
): Promise<{ mask: SelectedMask; why: string }> {
  const labels = masks.map((m) => m.label);
  const historySerialized = history.map((h) => `「${h.mask}」: ${h.text}`).join('\n');
  const json = await chatJson<RoutingJson>(
    [
      {
        role: 'system',
        content: `用户向读者团追问：「${userMessage}」。在场读者是 [${labels.join(', ')}]。请挑选**一位**最适合回答的读者，返回严格 JSON {"chosenMaskLabel": "...", "why": "..."}`,
      },
      { role: 'user', content: historySerialized },
    ],
    { model: 'deepseek-chat', temperature: 0.2, apiKey }
  );
  const matched = masks.find((m) => m.label === json.chosenMaskLabel);
  return { mask: matched ?? masks[0], why: json.why };
}

export async function runFollowup(
  selection: string,
  history: PersonaMessage[],
  userMessage: string,
  mask: SelectedMask,
  apiKey?: string
): Promise<PersonaMessage> {
  const historySerialized = history.map((h) => `「${h.mask}」: ${h.text}`).join('\n');
  const system = isCustomMask(mask)
    ? `${buildCustomMaskPrompt(mask)} 用户追问：「${userMessage}」。请以你的视角，60–120 字，给出回应。返回严格 JSON {"text": "...", "tags": [...]}.`
    : `你是「${mask.label}」读者：${mask.hint}。用户追问：「${userMessage}」。请以你的视角，60–120 字，给出回应。返回严格 JSON {"text": "...", "tags": [...]}.`;
  const json = await chatJson<Round1Json>(
    [
      { role: 'system', content: system },
      { role: 'user', content: `选中段落：${selection}\n\n此前讨论：\n${historySerialized}` },
    ],
    { model: 'deepseek-chat', temperature: 0.7, apiKey }
  );
  return {
    id: crypto.randomUUID(),
    round: 1,
    foxId: maskFoxId(mask),
    mask: mask.label,
    text: json.text,
    tags: Array.isArray(json.tags) ? json.tags : [],
    replyToMask: '你',
    time: '刚刚',
  };
}

export const PERSONA_FALLBACK: PersonaMessage[] = [
  {
    id: 'fb-1',
    round: 1,
    foxId: 'wen',
    mask: '路人读者',
    time: '刚刚',
    text: '"致命" 这个词在第一段就出现，路人读者会以为这是篇控诉文。我看到这两个字会先停一下、判断要不要看下去。',
    tags: ['情绪强度过高', '开篇判定'],
  },
  {
    id: 'fb-2',
    round: 1,
    foxId: 'wen',
    mask: '业内行家',
    time: '刚刚',
    text: '"致命" 在临床语境下是行话，不是修辞。给医生看的内容，这个词强度刚好——他们见过更狠的。建议：保留，但把读者预期拉回到"专业向"。',
    tags: ['术语判定', '专业读者'],
  },
  {
    id: 'fb-3',
    round: 1,
    foxId: 'wen',
    mask: '社畜读者',
    time: '8 秒前',
    text: '扫到第一段就走的概率很高。建议把 "黑盒特性" 那个 takeaway 提前到第一句，钩子前置。',
    tags: ['takeaway 前置'],
  },
  {
    id: 'fb-4',
    round: 1,
    foxId: 'wen',
    mask: '边界关注者',
    time: '5 秒前',
    text: '提一处合规风险：「致命」在医学声明上下文里建议避免——平台对 AI 替医生下判断的措辞越来越严。可改为 "在临床决策场景下高度受限"。',
    tags: ['合规标记', '措辞替换'],
  },
  {
    id: 'fb-5',
    round: 2,
    foxId: 'wen',
    mask: '路人读者',
    time: '2 秒前',
    replyToMask: '边界关注者',
    agree: true,
    text: '我同意 "边界关注者"。"高度受限" 路人读者也读得懂，强度更稳。',
    tags: [],
  },
];

export function FOLLOWUP_FALLBACK(userMessage: string, mask: SelectedMask): PersonaMessage {
  return {
    id: `fb-followup-${Date.now()}`,
    round: 1,
    foxId: isCustomMask(mask) ? 'wen2' : mask.fox,
    mask: mask.label,
    text: `（mock 模式）针对您的追问「${userMessage.slice(0, 30)}…」，这是占位回复。请补充 DeepSeek 余额以获取真实回应。`,
    tags: ['mock'],
    replyToMask: '你',
    time: '刚刚',
  };
}
