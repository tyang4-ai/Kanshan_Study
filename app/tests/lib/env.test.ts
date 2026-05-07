import { describe, it, expect } from 'vitest';
import { parseEnv } from '@/lib/env';

const validInput = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  KIMI_API_KEY: 'sk-kimi-test',
  DEEPSEEK_API_KEY: 'sk-deepseek',
  DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
  SILICONFLOW_API_KEY: 'sk-siliconflow',
  SILICONFLOW_BASE_URL: 'https://api.siliconflow.cn/v1',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
};

describe('parseEnv', () => {
  it('parses a complete valid env including KIMI_API_KEY', () => {
    const result = parseEnv(validInput);
    expect(result.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
    expect(result.KIMI_API_KEY).toBe('sk-kimi-test');
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

  it('does NOT throw when DEEPSEEK_API_KEY is absent (now optional after Kimi swap)', () => {
    const withoutDeepseek = { ...validInput, DEEPSEEK_API_KEY: undefined };
    expect(() => parseEnv(withoutDeepseek)).not.toThrow();
  });

  it('throws when KIMI_API_KEY is missing (now the required LLM key)', () => {
    const withoutKimi = { ...validInput, KIMI_API_KEY: undefined };
    expect(() => parseEnv(withoutKimi)).toThrow(/KIMI_API_KEY/);
  });

  it('throws when KIMI_API_KEY is empty string', () => {
    expect(() => parseEnv({ ...validInput, KIMI_API_KEY: '' })).toThrow(/KIMI_API_KEY/);
  });

  it('default KIMI_BASE_URL is https://api.moonshot.cn when not provided', () => {
    const result = parseEnv(validInput);
    expect(result.KIMI_BASE_URL).toBe('https://api.moonshot.cn');
  });

  it('respects explicit KIMI_BASE_URL override', () => {
    const result = parseEnv({ ...validInput, KIMI_BASE_URL: 'https://kimi.example.com' });
    expect(result.KIMI_BASE_URL).toBe('https://kimi.example.com');
  });

  it('default DEEPSEEK_BASE_URL is https://api.deepseek.com when not provided', () => {
    const { DEEPSEEK_BASE_URL: _omit, ...withoutBase } = validInput;
    void _omit;
    const result = parseEnv(withoutBase);
    expect(result.DEEPSEEK_BASE_URL).toBe('https://api.deepseek.com');
  });

  it('throws when NEXT_PUBLIC_SUPABASE_URL is malformed', () => {
    expect(() =>
      parseEnv({ ...validInput, NEXT_PUBLIC_SUPABASE_URL: 'not-a-url' }),
    ).toThrow();
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
