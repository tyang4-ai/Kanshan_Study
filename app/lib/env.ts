import { z } from 'zod';

export const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Kimi (Moonshot AI) — primary LLM provider as of 2026-05-05.
  // ¥199 organizer credit lands 2026-05-12. Until then, KIMI_API_KEY is a
  // placeholder; live LLM calls fail with 401, but cache-replay + tests are
  // unaffected.
  KIMI_API_KEY: z.string().min(1),
  KIMI_BASE_URL: z.string().url().default('https://api.moonshot.cn'),

  // DeepSeek — secondary provider, only used when a user supplies a DeepSeek
  // BYO key in the OnboardingGate. Optional after the Kimi swap.
  DEEPSEEK_API_KEY: z.string().min(1).optional(),
  DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),

  SILICONFLOW_API_KEY: z.string().min(1),
  SILICONFLOW_BASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  CLOUDFLARE_ACCOUNT_ID: z.string().min(1).optional(),
  CLOUDFLARE_API_TOKEN: z.string().min(1).optional(),
  CLOUDFLARE_ZONE_ID: z.string().min(1).optional(),

  ZHIHU_API_MODE: z.enum(['mock', 'real']).default('mock'),
  // 知乎 OpenAPI HMAC credentials (community APIs at https://openapi.zhihu.com).
  // Per docs at https://www.zhihu.com/ring/moltbook/api/community/quickstart,
  // requests are signed HMAC-SHA256 with X-* headers — NOT bearer auth.
  // - ZHIHU_APP_KEY: 知乎主页 URL suffix (the "people/<slug>" 部分; e.g.
  //   for `https://www.zhihu.com/people/foo` the value is `foo`)
  // - ZHIHU_APP_SECRET: 32-char application secret issued by organizers
  //   (received 2026-05-09); used as HMAC key
  ZHIHU_APP_KEY: z.string().optional(),
  ZHIHU_APP_SECRET: z.string().optional(),
  // OAuth credentials for /access_token + /user* endpoints. Optional —
  // OAuth is post-MVP per A9 mentor reply (only affects 人气奖 登录数 metric,
  // not 入围 eligibility). Apply via 知乎 separately when ready.
  ZHIHU_OAUTH_APP_ID: z.string().optional(),
  ZHIHU_OAUTH_APP_KEY: z.string().optional(),
  ZHIHU_OAUTH_REDIRECT_URI: z.string().url().optional(),
  // Deprecated 2026-05-10: community APIs use HMAC, not bearer. Kept optional
  // to avoid breaking existing .env.local files; new code paths must NOT read
  // this. Remove after 5/12 sprint hour 0 confirms HMAC works.
  ZHIHU_BEARER_TOKEN: z.string().optional(),
  CACHE_MODE: z.enum(['auto', 'cache-only', 'live-only']).default('auto'),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_VOICE_ID_NARRATOR: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(input: NodeJS.ProcessEnv | Record<string, string | undefined>): Env {
  return envSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: input.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: input.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: input.SUPABASE_SERVICE_ROLE_KEY,
    KIMI_API_KEY: input.KIMI_API_KEY,
    KIMI_BASE_URL: input.KIMI_BASE_URL,
    DEEPSEEK_API_KEY: input.DEEPSEEK_API_KEY,
    DEEPSEEK_BASE_URL: input.DEEPSEEK_BASE_URL,
    SILICONFLOW_API_KEY: input.SILICONFLOW_API_KEY,
    SILICONFLOW_BASE_URL: input.SILICONFLOW_BASE_URL,
    NEXT_PUBLIC_APP_URL: input.NEXT_PUBLIC_APP_URL,
    CLOUDFLARE_ACCOUNT_ID: input.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: input.CLOUDFLARE_API_TOKEN,
    CLOUDFLARE_ZONE_ID: input.CLOUDFLARE_ZONE_ID,
    ZHIHU_API_MODE: input.ZHIHU_API_MODE,
    ZHIHU_APP_KEY: input.ZHIHU_APP_KEY,
    ZHIHU_APP_SECRET: input.ZHIHU_APP_SECRET,
    ZHIHU_OAUTH_APP_ID: input.ZHIHU_OAUTH_APP_ID,
    ZHIHU_OAUTH_APP_KEY: input.ZHIHU_OAUTH_APP_KEY,
    ZHIHU_OAUTH_REDIRECT_URI: input.ZHIHU_OAUTH_REDIRECT_URI,
    ZHIHU_BEARER_TOKEN: input.ZHIHU_BEARER_TOKEN,
    CACHE_MODE: input.CACHE_MODE,
    ELEVENLABS_API_KEY: input.ELEVENLABS_API_KEY,
    ELEVENLABS_VOICE_ID_NARRATOR: input.ELEVENLABS_VOICE_ID_NARRATOR,
  });
}

let cached: Env | undefined;

export function getEnv(): Env {
  if (!cached) cached = parseEnv(process.env);
  return cached;
}
