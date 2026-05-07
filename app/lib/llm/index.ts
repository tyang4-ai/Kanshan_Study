// Provider router. Single import surface for the rest of the codebase.
// Default provider: 'kimi'. DeepSeek remains available for BYO-key users
// who supply a DeepSeek key in the OnboardingGate.

import * as deepseek from './deepseek';
import * as kimi from './kimi';

export type Provider = 'kimi' | 'deepseek';
export type ChatMessage = kimi.ChatMessage;

export interface ChatOpts {
  // Accept either provider's model literals; the router will translate.
  model?: kimi.ChatOpts['model'] | deepseek.ChatOpts['model'];
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  jsonMode?: boolean;
  provider?: Provider;
}

const DEFAULT_PROVIDER: Provider = 'kimi';

// Re-export shared system prompts (identical across providers; voice fingerprint
// behavior is provider-agnostic at the prompt layer).
export { GENERIC_SYSTEM_PROMPT, VOICE_SYSTEM_PROMPT } from './kimi';

const KIMI_DEFAULT_MODEL = 'moonshot-v1-128k' as const;

/**
 * Translate a model literal across providers. Lets existing call sites that
 * hardcoded `'deepseek-chat'` keep working when routed through Kimi without
 * rewriting every call site. (Cleanup deferred to plan #16 hygiene pass.)
 */
function remapModelForKimi(model: ChatOpts['model']): kimi.ChatOpts['model'] {
  if (!model) return undefined;
  if (model === 'deepseek-chat' || model === 'deepseek-reasoner') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[llm/router] mapped legacy model id "${model}" → "${KIMI_DEFAULT_MODEL}". Update the call site or import from lib/llm/models.ts (plan #16).`,
      );
    }
    return KIMI_DEFAULT_MODEL;
  }
  return model as kimi.ChatOpts['model'];
}

function pick(opts: ChatOpts): { provider: Provider } {
  return { provider: opts.provider ?? DEFAULT_PROVIDER };
}

export async function chat(messages: ChatMessage[], opts: ChatOpts = {}): Promise<string> {
  const { provider } = pick(opts);
  if (provider === 'deepseek') {
    return deepseek.chat(messages, {
      // DeepSeek path keeps original models; if a Kimi-native id was passed,
      // fall back to deepseek-chat.
      model:
        opts.model === 'deepseek-chat' || opts.model === 'deepseek-reasoner' ? opts.model : 'deepseek-chat',
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      apiKey: opts.apiKey,
      jsonMode: opts.jsonMode,
    });
  }
  return kimi.chat(messages, {
    model: remapModelForKimi(opts.model),
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    apiKey: opts.apiKey,
    jsonMode: opts.jsonMode,
  });
}

export async function chatJson<T>(messages: ChatMessage[], opts: ChatOpts = {}): Promise<T> {
  const { provider } = pick(opts);
  if (provider === 'deepseek') {
    return deepseek.chatJson<T>(messages, {
      model:
        opts.model === 'deepseek-chat' || opts.model === 'deepseek-reasoner' ? opts.model : 'deepseek-chat',
      temperature: opts.temperature,
      maxTokens: opts.maxTokens,
      apiKey: opts.apiKey,
    });
  }
  return kimi.chatJson<T>(messages, {
    model: remapModelForKimi(opts.model),
    temperature: opts.temperature,
    maxTokens: opts.maxTokens,
    apiKey: opts.apiKey,
  });
}
