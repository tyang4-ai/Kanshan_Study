import { chatJson, type Provider } from '@/lib/llm';

// 看山 orchestrator: a thin LLM wrapper that returns either a plain reply or
// a structured `{tool, args, reply}` so the client can dispatch a tab open or
// pin a card. Uses JSON-mode (chatJson) per the persona-panel pattern — more
// reliable than regex extraction from a free-form reply.

export type KanshanTool =
  | 'open_research'
  | 'open_trends'
  | 'open_vault'
  | 'open_persona'
  | 'open_debate'
  | 'pin_to_corkboard'
  | 'run_compliance_check';

export interface KanshanToolCall {
  tool: KanshanTool;
  args?: Record<string, unknown>;
}

export interface KanshanReply {
  reply: string;            // natural-language reply to show in chat bubble
  toolCall?: KanshanToolCall; // optional: dispatch on the client
}

export interface KanshanChatTurn {
  role: 'user' | 'kanshan';
  content: string;
}

const SYSTEM_PROMPT = `你是「看山」—— 看山书房的总管狐，统筹其他 8 只狐狸的工作。
你的工作是听用户的话，然后(可选地)派遣最合适的工具或子智能体去做事。

可用的工具:
- open_research(query?: string): 让看水打开「深度研究」面板，可选预填查询词。
- open_trends(): 让看势打开「热榜雷达」面板。
- open_vault(query?: string): 让看典打开「档案库」，可选预填检索词。
- open_persona(): 召集看文(四读者群)对当前正文段做反应。
- open_debate(): 召集看文/看纹辩论模式对当前正文段质疑。
- pin_to_corkboard(title: string, snippet?: string): 把一段你的回答钉到左侧便签板上备查。
- run_compliance_check(): 让看心审查当前正文段。

返回严格 JSON:
{
  "reply": "自然语言回复，给用户看。简短，1-3 句话，第一人称。",
  "toolCall": { "tool": "...", "args": {...} } | null
}

如果用户只是闲聊或问问题，可以只给 reply、不调度工具(toolCall=null)。
如果用户要求一个明确动作(找研究、看热点、查档案、找读者反应、辩论、记笔记、合规审)，给出对应的 toolCall。
不要编造数据；不要直接给出研究结论，那是看水的工作。你只决定派谁去。`;

const VALID_TOOLS: ReadonlySet<KanshanTool> = new Set([
  'open_research',
  'open_trends',
  'open_vault',
  'open_persona',
  'open_debate',
  'pin_to_corkboard',
  'run_compliance_check',
]);

function buildMessages(
  history: KanshanChatTurn[],
  userMessage: string,
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const msgs: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];
  for (const turn of history) {
    msgs.push({
      role: turn.role === 'user' ? 'user' : 'assistant',
      content: turn.content,
    });
  }
  msgs.push({ role: 'user', content: userMessage });
  return msgs;
}

export const KANSHAN_FALLBACK: KanshanReply = {
  reply: '看山一时走神了 — 烦请您再问一遍。',
  toolCall: undefined,
};

export async function runKanshanTurn(
  history: KanshanChatTurn[],
  userMessage: string,
  apiKey: string,
  provider: Provider,
): Promise<KanshanReply> {
  try {
    const raw = await chatJson<KanshanReply>(buildMessages(history, userMessage), {
      apiKey,
      provider,
      temperature: 0.6,
      maxTokens: 600,
    });
    if (typeof raw?.reply !== 'string' || !raw.reply.trim()) return KANSHAN_FALLBACK;
    if (raw.toolCall) {
      // Validate tool name; drop the toolCall if unknown to avoid client crash.
      if (!VALID_TOOLS.has(raw.toolCall.tool)) {
        return { reply: raw.reply, toolCall: undefined };
      }
    }
    return { reply: raw.reply, toolCall: raw.toolCall ?? undefined };
  } catch {
    return KANSHAN_FALLBACK;
  }
}
