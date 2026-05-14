import { chatJson, type Provider } from '@/lib/llm';
import { SYSTEM_PROMPT } from '@/lib/foxes/prompts/shan';

// 看山 orchestrator: a thin LLM wrapper that returns either a plain reply or
// a structured `{tool, args, reply}` so the client can dispatch a tab open or
// pin a card. Uses JSON-mode (chatJson) per the persona-panel pattern — more
// reliable than regex extraction from a free-form reply.
// System prompt lives in `lib/foxes/prompts/shan.ts` (颜鑫 R3 P1 2026-05-12).

export type KanshanTool =
  | 'open_research'
  | 'open_trends'
  | 'open_vault'
  | 'open_persona'
  | 'open_debate'
  | 'open_voice_diff'
  | 'pin_to_corkboard'
  | 'run_compliance_check'
  | 'orchestrate';

// Multi-fox dispatch — emit one entry per sub-tool so the client opens each in
// sequence. Used when 看山 wants to fire 看水 AND 看典 (or any pair) on a
// single turn. R5 (周源 / emmett P0 2026-05-13): the cached demo path uses
// this so Step 1 promises (parallel 看水+看典) actually fire.
export interface KanshanOrchestrationCall {
  tool: 'orchestrate';
  args: {
    open: Array<{
      kind: 'research' | 'vault' | 'trends' | 'persona' | 'debate' | 'voice-diff';
      query?: string;
      scope?: 'quick' | 'deep' | 'thorough';
    }>;
  };
}

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

const VALID_TOOLS: ReadonlySet<KanshanTool> = new Set([
  'open_research',
  'open_trends',
  'open_vault',
  'open_persona',
  'open_debate',
  'open_voice_diff',
  'pin_to_corkboard',
  'run_compliance_check',
  'orchestrate',
]);

const VALID_ORCHESTRATE_KINDS: ReadonlySet<string> = new Set([
  'research', 'vault', 'trends', 'persona', 'debate', 'voice-diff',
]);

function isValidOrchestrate(args: unknown): args is KanshanOrchestrationCall['args'] {
  if (!args || typeof args !== 'object') return false;
  const a = args as { open?: unknown };
  if (!Array.isArray(a.open) || a.open.length === 0) return false;
  return a.open.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const it = item as { kind?: unknown };
    return typeof it.kind === 'string' && VALID_ORCHESTRATE_KINDS.has(it.kind);
  });
}

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
      // Orchestrate is the multi-tool path — args must contain a non-empty
      // `open[]` array of supported kinds, otherwise drop the dispatch.
      if (raw.toolCall.tool === 'orchestrate' && !isValidOrchestrate(raw.toolCall.args)) {
        return { reply: raw.reply, toolCall: undefined };
      }
    }
    return { reply: raw.reply, toolCall: raw.toolCall ?? undefined };
  } catch {
    return KANSHAN_FALLBACK;
  }
}
