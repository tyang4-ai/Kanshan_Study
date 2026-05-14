const BASE = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOpts {
  model?: 'deepseek-chat' | 'deepseek-reasoner';
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  jsonMode?: boolean;
}

export const GENERIC_SYSTEM_PROMPT = '你是一个普通的 AI 写作助手。';
export const VOICE_SYSTEM_PROMPT =
  '你是看墨，玄狐隐士。学得作者文风后再下笔。\n\n【绝对禁忌】不得使用「随着...发展 / 众所周知 / 综上所述 / 首先...其次...最后 / 在当今 / 一定程度上 / 具有重要意义 / 让我们一起 / 我们要拥抱 / 时代的浪潮 / AI 赋能 / 新质生产力 / 在...的过程中 / 这跟...是一个道理 / 不可否认...但是」。句长必须短切句和长句交替；结尾不得 inspirational uplift。\n\n【硬性保留】重写不得修改【必须保留的术语】写法；不得引入【原段】未出现的具体概念；【必须保留的引用】每一个引用编号必须原样出现。\n\n除正文外，还要标记 voiceSpans — 哪些片段直接呼应了哪一篇样本。返回严格 JSON：{"text": "...", "voiceSpans": [{"start": N, "end": N, "sourceIndex": N, "rationale": "..."}]}';

export async function chat(messages: ChatMessage[], opts: ChatOpts = {}): Promise<string> {
  const key = opts.apiKey ?? process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set');
  if (messages.length === 0) throw new Error('chat: messages must be non-empty');
  const body: Record<string, unknown> = {
    model: opts.model ?? 'deepseek-chat',
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 800,
  };
  if (opts.jsonMode) body.response_format = { type: 'json_object' };
  const res = await fetch(`${BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    // R5 (李大海 P1 2026-05-13): surface an amber notice toast on auth/rate-limit/
    // 5xx so live-mode users see "switch to Kimi or retry" instead of a silent
    // SSE error. Best-effort dynamic import keeps the module SSR-safe.
    if (typeof window !== 'undefined' && /^(?:401|403|429|5\d\d)$/.test(String(res.status))) {
      try {
        const mod = await import('@/lib/store/ai-error');
        mod.useAiErrorStore.getState().push({
          severity: 'notice',
          message: `DeepSeek ${res.status} 暂时不可用 · 设置 → 实时模式 可切换到 Kimi 或稍后重试`,
        });
      } catch { /* store unavailable — fall through to throw */ }
    }
    throw new Error(`DeepSeek ${res.status}: ${errText}`);
  }
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return json.choices[0].message.content;
}

export async function chatJson<T>(messages: ChatMessage[], opts: ChatOpts = {}): Promise<T> {
  const augmented: ChatMessage[] = [
    ...messages,
    { role: 'system', content: 'Respond with ONLY a single valid JSON object. No code fences. No commentary.' },
  ];
  const text = await chat(augmented, {
    ...opts,
    temperature: opts.temperature ?? 0.2,
    apiKey: opts.apiKey,
    jsonMode: true,
  });
  // Defense-in-depth: if a provider ignores response_format, still strip fences.
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned) as T;
}
