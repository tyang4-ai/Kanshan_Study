import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { proxyAuth } from '@/lib/apikey/proxy';

function makeReq(headers: Record<string, string> = {}): Request {
  const h = new Headers();
  for (const [k, v] of Object.entries(headers)) h.set(k, v);
  return { headers: h } as unknown as Request;
}

describe('proxyAuth', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns BYO key from Authorization: Bearer sk-...', () => {
    const req = makeReq({ authorization: 'Bearer sk-validkey' });
    expect(proxyAuth(req)).toBe('sk-validkey');
  });

  it('case-insensitive bearer prefix preserves the rest verbatim', () => {
    const req = makeReq({ authorization: 'bearer sk-validkey' });
    expect(proxyAuth(req)).toBe('sk-validkey');
  });

  it('falls back to DEEPSEEK_API_KEY when no Authorization header', () => {
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-fallback');
    const req = makeReq({});
    expect(proxyAuth(req)).toBe('sk-fallback');
  });

  it('falls back to env when Authorization lacks sk- prefix', () => {
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-fallback');
    const req = makeReq({ authorization: 'Bearer some-other' });
    expect(proxyAuth(req)).toBe('sk-fallback');
  });

  it('throws when no Authorization header AND no env fallback', () => {
    vi.stubEnv('DEEPSEEK_API_KEY', '');
    const req = makeReq({});
    expect(() => proxyAuth(req)).toThrow('No DeepSeek API key available');
  });
});
