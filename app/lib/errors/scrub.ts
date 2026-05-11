// Persona-review R4 (Cao Renxin) P1: SSE error events were leaking raw
// upstream error bodies that could contain provider API keys or secret-shaped
// strings. Centralize the scrub so all 4 agent routes use the same coverage.
//
// Patterns flagged (case-insensitive):
//   - OpenAI/Moonshot/DeepSeek/SiliconFlow: sk-...
//   - Cloudflare:                            cfat_...
//   - Vercel:                                vc[kp]_...
//   - Anthropic:                             sk-ant-...
//   - GitHub:                                ghp_..., gho_..., ghs_..., ghu_..., ghr_...
//   - AWS:                                   AKIA[A-Z0-9]{16}
//   - JWT (Supabase/etc):                    eyJ[a-zA-Z0-9_-]+\.eyJ...
//   - Zhihu Access Bearer:                   X2L[A-Z0-9]{20,}
//   - Generic "API_KEY" / "TOKEN" / "Bearer" mentions
//   - Long random alphanumeric strings (likely secrets)

const SECRET_PATTERNS: RegExp[] = [
  /sk-[a-zA-Z0-9_-]{6,}/,
  /sk-ant-[a-zA-Z0-9_-]{6,}/,
  /cfat_[a-zA-Z0-9]{20,}/,
  /vc[kp]_[a-zA-Z0-9]{20,}/,
  /gh[pousr]_[A-Za-z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}/,
  /X2L[A-Z0-9]{20,}/i,
  /api[\s_-]?key/i,
  /bearer/i,
  /access[\s_-]?token/i,
  /secret/i,
  // Long base64-ish blob: 24+ chars of [A-Za-z0-9+/=]
  /[A-Za-z0-9+/=]{32,}/,
];

const GENERIC_FALLBACK = '上游服务暂不可用';

export function scrubErrorForClient(msg: string): string {
  if (!msg || typeof msg !== 'string') return GENERIC_FALLBACK;
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(msg)) return GENERIC_FALLBACK;
  }
  if (msg.length > 200) return msg.slice(0, 200) + '…';
  return msg;
}
