import { describe, it, expect } from 'vitest';
import { parseEnv } from '@/lib/env';

const validInput = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  DEEPSEEK_API_KEY: 'sk-deepseek',
  DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
  SILICONFLOW_API_KEY: 'sk-siliconflow',
  SILICONFLOW_BASE_URL: 'https://api.siliconflow.cn/v1',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
};

describe('parseEnv', () => {
  it('parses a complete valid env with all 8 required keys', () => {
    const result = parseEnv(validInput);
    expect(result.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
    expect(result.DEEPSEEK_API_KEY).toBe('sk-deepseek');
    expect(result.ZHIHU_API_MODE).toBe('mock');
    expect(result.CACHE_MODE).toBe('auto');
  });

  it('applies defaults for ZHIHU_API_MODE and CACHE_MODE when absent', () => {
    const result = parseEnv(validInput);
    expect(result.ZHIHU_API_MODE).toBe('mock');
    expect(result.CACHE_MODE).toBe('auto');
  });

  it('respects explicit ZHIHU_API_MODE=real and CACHE_MODE=cache-only', () => {
    const result = parseEnv({
      ...validInput,
      ZHIHU_API_MODE: 'real',
      CACHE_MODE: 'cache-only',
    });
    expect(result.ZHIHU_API_MODE).toBe('real');
    expect(result.CACHE_MODE).toBe('cache-only');
  });

  it('passes when optional Cloudflare/Zhihu/ElevenLabs keys are absent', () => {
    expect(() => parseEnv(validInput)).not.toThrow();
  });

  it('throws when a required key is missing', () => {
    const withoutDeepseek = { ...validInput, DEEPSEEK_API_KEY: undefined };
    expect(() => parseEnv(withoutDeepseek)).toThrow(/DEEPSEEK_API_KEY/);
  });

  it('throws when NEXT_PUBLIC_SUPABASE_URL is malformed', () => {
    expect(() =>
      parseEnv({ ...validInput, NEXT_PUBLIC_SUPABASE_URL: 'not-a-url' }),
    ).toThrow();
  });

  it('throws when DEEPSEEK_API_KEY is empty string', () => {
    expect(() => parseEnv({ ...validInput, DEEPSEEK_API_KEY: '' })).toThrow();
  });

  it('throws when ZHIHU_API_MODE has invalid enum value', () => {
    expect(() =>
      parseEnv({ ...validInput, ZHIHU_API_MODE: 'fake-mode' }),
    ).toThrow();
  });

  it('throws when CACHE_MODE has invalid enum value', () => {
    expect(() =>
      parseEnv({ ...validInput, CACHE_MODE: 'turbo' }),
    ).toThrow();
  });

  it('accepts localhost URL for NEXT_PUBLIC_APP_URL', () => {
    expect(() =>
      parseEnv({ ...validInput, NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }),
    ).not.toThrow();
  });
});
