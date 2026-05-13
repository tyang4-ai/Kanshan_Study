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
  // 知乎 has TWO parallel API platforms with separate auth:
  //   1. developer.zhihu.com — Bearer AccessKey (data: hot_list / search / 直答)
  //   2. openapi.zhihu.com (moltbook) — HMAC-SHA256 (community: story / pin / comment)
  // See Documents/zhihu-api/05-api-spec-developer-platform-2026-05-10.md and
  // Documents/zhihu-api/03-api-spec-quickstart-2026-05-10.md.
  //
  // ZHIHU_ACCESS_SECRET: Bearer AccessKey for developer.zhihu.com (verified
  // at developer.zhihu.com/profile on 2026-05-10). Format: `Authorization:
  // Bearer <secret>` + `X-Request-Timestamp: <unix_seconds>` headers.
  ZHIHU_ACCESS_SECRET: z.string().optional(),
  // HMAC credentials for openapi.zhihu.com (moltbook community APIs).
  // - ZHIHU_APP_KEY: 知乎主页 URL suffix (the "people/<slug>" 部分)
  // - ZHIHU_APP_SECRET: HMAC secret (NOT the same as ZHIHU_ACCESS_SECRET).
  //   Apply at https://www.zhihu.com/ring/moltbook.
  ZHIHU_APP_KEY: z.string().optional(),
  ZHIHU_APP_SECRET: z.string().optional(),
  // OAuth credentials for /access_token + /user* endpoints. Optional —
  // OAuth is post-MVP per A9 mentor reply (only affects 人气奖 登录数 metric,
  // not 入围 eligibility). Apply via 知乎 separately when ready.
  ZHIHU_OAUTH_APP_ID: z.string().optional(),
  ZHIHU_OAUTH_APP_KEY: z.string().optional(),
  ZHIHU_OAUTH_REDIRECT_URI: z.string().url().optional(),
  // OAuth authorize endpoint not documented in captured spec; default to the
  // public 知乎 OAuth page, env-overridable when the platform publishes a
  // canonical URL.
  ZHIHU_OAUTH_AUTHORIZE_URL: z.string().url().default('https://www.zhihu.com/oauth/authorize'),
  // Session signing secret for the kanshan-zhihu-session HMAC cookie. Optional
  // at module load (cache-only / no-OAuth deploys are valid); the OAuth routes
  // return 503 at request time when missing.
  KANSHAN_SESSION_SECRET: z.string().min(32).optional(),
  CACHE_MODE: z.enum(['auto', 'cache-only', 'live-only']).default('cache-only'),
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
    ZHIHU_ACCESS_SECRET: input.ZHIHU_ACCESS_SECRET,
    ZHIHU_APP_KEY: input.ZHIHU_APP_KEY,
    ZHIHU_APP_SECRET: input.ZHIHU_APP_SECRET,
    ZHIHU_OAUTH_APP_ID: input.ZHIHU_OAUTH_APP_ID,
    ZHIHU_OAUTH_APP_KEY: input.ZHIHU_OAUTH_APP_KEY,
    ZHIHU_OAUTH_REDIRECT_URI: input.ZHIHU_OAUTH_REDIRECT_URI,
    ZHIHU_OAUTH_AUTHORIZE_URL: input.ZHIHU_OAUTH_AUTHORIZE_URL,
    KANSHAN_SESSION_SECRET: input.KANSHAN_SESSION_SECRET,
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
