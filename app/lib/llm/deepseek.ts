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
}

export const GENERIC_SYSTEM_PROMPT = '你是一个普通的 AI 写作助手。';
export const VOICE_SYSTEM_PROMPT =
  '你是看墨，玄狐隐士。学得作者文风后再下笔。除正文外，还要标记 voiceSpans — 哪些片段直接呼应了哪一篇样本。返回严格 JSON：{"text": "...", "voiceSpans": [{"start": N, "end": N, "sourceIndex": N, "rationale": "..."}]}';

export async function chat(messages: ChatMessage[], opts: ChatOpts = {}): Promise<string> {
  const key = opts.apiKey ?? process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY is not set');
  if (messages.length === 0) throw new Error('chat: messages must be non-empty');
  const res = await fetch(`${BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model ?? 'deepseek-chat',
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 800,
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return json.choices[0].message.content;
}

export async function chatJson<T>(messages: ChatMessage[], opts: ChatOpts = {}): Promise<T> {
  const augmented: ChatMessage[] = [
    ...messages,
    { role: 'system', content: 'Respond with ONLY a single valid JSON object. No code fences. No commentary.' },
  ];
  const text = await chat(augmented, { ...opts, temperature: opts.temperature ?? 0.2, apiKey: opts.apiKey });
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned) as T;
}
