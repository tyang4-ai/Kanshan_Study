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
