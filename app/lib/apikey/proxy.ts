// Returns the API key + provider to use for downstream LLM calls.
// User's BYO key (Authorization: Bearer sk-...) wins; provider chosen at
// onboarding (kanshan-provider cookie). App fallback uses Kimi.

import type { Provider } from '@/lib/llm';

export interface ProxyCreds {
  key: string;
  provider: Provider;
  source: 'user' | 'app';
}

function readProviderCookie(req: Request): Provider | null {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;
  const match = /(?:^|;\s*)kanshan-provider=(kimi|deepseek)\b/.exec(cookieHeader);
  return match ? (match[1] as Provider) : null;
}

export function proxyAuth(req: Request): ProxyCreds {
  const auth = req.headers.get('authorization');
  if (auth && auth.toLowerCase().startsWith('bearer sk-')) {
    return {
      key: auth.slice('bearer '.length),
      // BYO key: use the provider the user picked in onboarding; default kimi.
      provider: readProviderCookie(req) ?? 'kimi',
      source: 'user',
    };
  }
  const kimiKey = process.env.KIMI_API_KEY;
  if (kimiKey) {
    return { key: kimiKey, provider: 'kimi', source: 'app' };
  }
  // Last-resort fallback for environments where only DeepSeek is configured
  // (e.g., legacy CI). Kept to keep the test fixtures from breaking.
  // R6 security review (Hu Wei) P1: log when this fires so a stray DEEPSEEK_API_KEY
  // env on a Kimi-only deploy doesn't silently re-route traffic — a soft 备案
  // policy violation (the user got Kimi consented in onboarding, not DeepSeek).
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (deepseekKey) {
    console.warn('[proxyAuth] KIMI_API_KEY missing — falling back to DEEPSEEK_API_KEY. Set KIMI_API_KEY or remove DEEPSEEK_API_KEY to silence.');
    return { key: deepseekKey, provider: 'deepseek', source: 'app' };
  }
  throw new Error('No LLM API key available (KIMI_API_KEY or DEEPSEEK_API_KEY)');
}
