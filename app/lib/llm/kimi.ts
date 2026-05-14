// Kimi (Moonshot AI) adapter — primary LLM provider as of 2026-05-05.
// Mirrors the shape of deepseek.ts so the router in lib/llm/index.ts can
// dispatch to either with identical call sites.

const BASE = process.env.KIMI_BASE_URL ?? 'https://api.moonshot.cn';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOpts {
  model?:
    | 'kimi-k2.6'
    | 'kimi-k2.5'
    | 'moonshot-v1-auto'
    | 'moonshot-v1-8k'
    | 'moonshot-v1-32k'
    | 'moonshot-v1-128k';
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  jsonMode?: boolean;
}

export const GENERIC_SYSTEM_PROMPT = '你是一个普通的 AI 写作助手。';
export const VOICE_SYSTEM_PROMPT =
  '你是看墨，玄狐隐士。学得作者文风后再下笔。\n\n【绝对禁忌 · 任何一条出现都算重写失败】\n- 不得使用「随着...发展 / 众所周知 / 综上所述 / 首先...其次...最后 / 在当今 / 一定程度上 / 具有重要意义 / 让我们一起 / 我们要拥抱 / 时代的浪潮 / AI 赋能 / 新质生产力」这类 AI-味套话。\n- 不得用「在...的过程中 / 这跟...是一个道理 / 举个具体的例子」这类教科书式连接词起句。\n- 不得用「不可否认...但是 / 我们必须承认...同时也要看到」这类两面派结构。\n- 句长必须有变化（短切句和长句交替），不得段段同节奏。\n- 结尾不得 inspirational uplift；不得「让我们...」「展望未来...」「共同迎接...」。\n\n【硬性保留】\n- 重写不得修改【必须保留的术语】中任意一项的写法（不得替换近义词、不得删除）。\n- 不得引入【原段】未出现的具体概念，即使【作者样本】里讨论过相关话题。\n- 【必须保留的引用】里的每一个引用编号（如 [3] / [v7] / [@答主]）必须原样出现在输出中。\n\n【作者语风指纹】优先级高于【作者样本】——如果禁用语在样本里出现，那是作者本人偶发的失误，不要复现。如果指纹给了 signature 短语，在合适位置自然嵌入 1-3 个，不要堆砌。\n\n除正文外，还要标记 voiceSpans — 哪些片段直接呼应了哪一篇样本。返回严格 JSON：{"text": "...", "voiceSpans": [{"start": N, "end": N, "sourceIndex": N, "rationale": "..."}]}';

export async function chat(messages: ChatMessage[], opts: ChatOpts = {}): Promise<string> {
  const key = opts.apiKey ?? process.env.KIMI_API_KEY;
  if (!key) throw new Error('KIMI_API_KEY is not set');
  if (messages.length === 0) throw new Error('chat: messages must be non-empty');
  // Most-powerful default = moonshot-v1-128k:
  //   - Largest context (128k) — fits any vault-grounding payload without truncation
  //   - Accepts the full 0..2 temperature range
  //   - Honors response_format json_object cleanly
  // For chatJson() the JSON-strict variant locks to v1-128k (kimi-k2.* emits
  // thinking tokens that break JSON.parse). For plain chat(), kimi-k2.6 is the
  // SOTA reasoning model and gets used when the caller passes it explicitly,
  // but our agents stick with v1-128k so all calls share one model and one
  // pricing tier (simpler ¥199 budget math + identical behavior on retry).
  const model = opts.model ?? 'moonshot-v1-128k';
  const isK2 = model.startsWith('kimi-k');
  const body: Record<string, unknown> = {
    model,
    messages,
    // kimi-k2.* reject any temperature other than 1; coerce silently.
    temperature: isK2 ? 1 : opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 800,
  };
  if (opts.jsonMode) body.response_format = { type: 'json_object' };
  // Moonshot trial / lower-tier orgs cap concurrency at 3; persona-panel fans
  // out 4 parallel mask calls. Retry once on 429 with the wait Moonshot suggests.
  let res: Response;
  for (let attempt = 0; ; attempt++) {
    res = await fetch(`${BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status !== 429 || attempt >= 2) break;
    // Exponential-ish backoff: 1.2s, 2.4s
    await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
  }
  if (!res.ok) {
    const errText = await res.text();
    // R5 (李大海 P1 2026-05-13): when Kimi is unreachable, surface an amber
    // notice toast so live-mode users get a clear "switch to DeepSeek or
    // retry" hint instead of a silent SSE error. Best-effort dynamic import
    // keeps the server-only kimi.ts module client-safe and won't break SSR.
    if (typeof window !== 'undefined' && /^(?:401|403|429|5\d\d)$/.test(String(res.status))) {
      try {
        const mod = await import('@/lib/store/ai-error');
        mod.useAiErrorStore.getState().push({
          severity: 'notice',
          message: `Kimi ${res.status} 暂时不可用 · 设置 → 实时模式 可切换到 DeepSeek 或稍后重试`,
        });
      } catch { /* store unavailable — fall through to throw */ }
    }
    throw new Error(`Kimi ${res.status}: ${errText}`);
  }
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return json.choices[0].message.content;
}

/** Thrown when Kimi returns a body that survives fence-stripping but still
 * isn't valid JSON (truncated stream, safety-filtered partial response,
 * thinking-token preamble that slipped past the regex). Routes can catch this
 * and emit a typed `event: error` over SSE instead of bare 500s. */
export class LlmJsonParseError extends Error {
  constructor(public readonly raw: string, cause?: unknown) {
    super(`LLM returned non-JSON body (${raw.length} chars): ${raw.slice(0, 120)}…`);
    this.name = 'LlmJsonParseError';
    if (cause) (this as { cause?: unknown }).cause = cause;
  }
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
  // Defense-in-depth: if response_format is ignored upstream, still strip fences.
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new LlmJsonParseError(cleaned, err);
  }
}
