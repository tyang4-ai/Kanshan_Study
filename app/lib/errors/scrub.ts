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

// R7 production-readiness review (Jiang Hanzhi) P0: the previous policy
// replaced the entire message with 「上游服务暂不可用」 whenever ANY pattern
// fired. That over-scrubbed (a) common Chinese error sentences that
// happened to contain "api key" / "secret" / "bearer" and (b) any payload
// containing a 32-char alphanumeric run (TipTap doc IDs, UUIDs concat'd,
// long Chinese text). Demo-day debugging surfaced only the opaque fallback.
//
// New policy: redact the *matched substring* with `[redacted]`, keeping the
// surrounding context so the user/operator still has actionable signal.
// Only the two cases that genuinely can't be salvaged — empty input and
// a message that's *all* secret — fall back to the generic string.
//
// Patterns flagged (case-insensitive). Order matters: high-confidence /
// long-shape secrets first, generic keyword catchers last.

const SECRET_PATTERNS: RegExp[] = [
  /sk-ant-[a-zA-Z0-9_-]{6,}/g,
  /sk-[a-zA-Z0-9_-]{16,}/g, // tightened 6 → 16 so "sk-12345" length-shorts pass; real keys are 32+
  /cfat_[a-zA-Z0-9]{20,}/g,
  /vc[kp]_[a-zA-Z0-9]{20,}/g,
  /gh[pousr]_[A-Za-z0-9]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}/g,
  /X2L[A-Z0-9]{20,}/gi,
  // R8 adversarial (Ren Bo) R8-P1d: previous env-var pattern matched bare
  // identifier mentions like `KIMI_API_KEY is not set`, hiding the actual
  // missing-env diagnostic. Now require an assignment shape (`=`, `:`, or
  // quoted-with-value) — so the env name in a 'X is not set' message reads
  // cleanly, but `DEEPSEEK_API_KEY=sk-...` still gets the whole assignment
  // redacted via the sk- pattern.
  /\b[A-Z][A-Z0-9_]+_(API_KEY|KEY|SECRET|TOKEN|PASSWORD)\s*[=:]\s*\S+/g,
  // R8 adversarial (Ren Bo) R8-P1c: 40-char alphanumeric blob false-positived
  // on TipTap doc IDs / long hex hashes. Now require a secret-shape preamble
  // (bearer / key / token / secret / authorization / api[_-]?key, or the
  // assignment chars `=` / `:` directly before). Lookbehind preserves the
  // preamble in output — only the blob itself is redacted.
  /(?<=\b(?:bearer|key|token|secret|authorization|password|api[_-]?key)\b\s*[=:]?\s*|[=:]\s)[A-Za-z0-9+/=]{40,}/gi,
];

const REDACTED = '[redacted]';
const GENERIC_FALLBACK = '上游服务暂不可用';

// R8 adversarial review (Ren Bo) P0: zero-width-space + bidi-control + other
// invisible-Unicode characters slipped past the alphanumeric secret patterns.
// `sk-aaaa<U+200B>bbbb...` was not redacted because [a-zA-Z0-9_-] doesn't span
// U+200B. Strip invisibles BEFORE pattern matching so the regexes see a
// contiguous token shape. Covers ZWSP, ZWNJ, ZWJ, ZWNBSP, BOM, bidi-controls.
const INVISIBLE_CHARS = /[​-‏⁠﻿‪-‮⁦-⁩]/g;

export function scrubErrorForClient(msg: string): string {
  if (!msg || typeof msg !== 'string') return GENERIC_FALLBACK;
  let out = msg.replace(INVISIBLE_CHARS, '');
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, REDACTED);
  }
  // If redaction ate the entire message (or left only redaction markers /
  // punctuation), fall back to the generic so we don't surface naked
  // `[redacted]` to the client — it's confusing without context.
  const meaningful = out.replace(/\[redacted\]/g, '').replace(/[\s.,:;!?，。：；！？]+/g, '');
  if (meaningful.length === 0) return GENERIC_FALLBACK;
  if (out.length > 200) return out.slice(0, 200) + '…';
  return out;
}
