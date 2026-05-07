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

  it('BYO key: Authorization: Bearer sk-... → { key, provider: "kimi" (default), source: "user" }', () => {
    const req = makeReq({ authorization: 'Bearer sk-validkey' });
    expect(proxyAuth(req)).toEqual({
      key: 'sk-validkey',
      provider: 'kimi',
      source: 'user',
    });
  });

  it('case-insensitive bearer prefix preserves the rest verbatim', () => {
    const req = makeReq({ authorization: 'bearer sk-validkey' });
    expect(proxyAuth(req)).toEqual({
      key: 'sk-validkey',
      provider: 'kimi',
      source: 'user',
    });
  });

  it('BYO key + kanshan-provider=kimi cookie → provider: "kimi"', () => {
    const req = makeReq({
      authorization: 'Bearer sk-byo',
      cookie: 'kanshan-provider=kimi',
    });
    expect(proxyAuth(req)).toEqual({
      key: 'sk-byo',
      provider: 'kimi',
      source: 'user',
    });
  });

  it('BYO key + kanshan-provider=deepseek cookie → provider: "deepseek"', () => {
    const req = makeReq({
      authorization: 'Bearer sk-byo',
      cookie: 'kanshan-provider=deepseek',
    });
    expect(proxyAuth(req)).toEqual({
      key: 'sk-byo',
      provider: 'deepseek',
      source: 'user',
    });
  });

  it('BYO key + invalid cookie value (foo) → falls back to default provider "kimi"', () => {
    const req = makeReq({
      authorization: 'Bearer sk-byo',
      cookie: 'kanshan-provider=foo',
    });
    expect(proxyAuth(req)).toEqual({
      key: 'sk-byo',
      provider: 'kimi',
      source: 'user',
    });
  });

  it('BYO key + cookie present but no kanshan-provider entry → provider: "kimi"', () => {
    const req = makeReq({
      authorization: 'Bearer sk-byo',
      cookie: 'other=value; another=thing',
    });
    expect(proxyAuth(req).provider).toBe('kimi');
  });

  it('BYO key + multi-cookie header with kanshan-provider=deepseek → provider: "deepseek"', () => {
    const req = makeReq({
      authorization: 'Bearer sk-byo',
      cookie: 'foo=bar; kanshan-provider=deepseek; baz=qux',
    });
    expect(proxyAuth(req).provider).toBe('deepseek');
  });

  it('No BYO + KIMI_API_KEY env set → { key, provider: "kimi", source: "app" }', () => {
    vi.stubEnv('KIMI_API_KEY', 'sk-kimi-fallback');
    const req = makeReq({});
    expect(proxyAuth(req)).toEqual({
      key: 'sk-kimi-fallback',
      provider: 'kimi',
      source: 'app',
    });
  });

  it('No BYO + no KIMI_API_KEY but DEEPSEEK_API_KEY set → { key, provider: "deepseek", source: "app" }', () => {
    vi.stubEnv('KIMI_API_KEY', '');
    vi.stubEnv('DEEPSEEK_API_KEY', 'sk-deepseek-fallback');
    const req = makeReq({});
    expect(proxyAuth(req)).toEqual({
      key: 'sk-deepseek-fallback',
      provider: 'deepseek',
      source: 'app',
    });
  });

  it('Neither env set → throws "No LLM API key available..."', () => {
    vi.stubEnv('KIMI_API_KEY', '');
    vi.stubEnv('DEEPSEEK_API_KEY', '');
    const req = makeReq({});
    expect(() => proxyAuth(req)).toThrow(/No LLM API key available/);
  });

  it('Authorization without bearer prefix → goes to env fallback path (not user)', () => {
    vi.stubEnv('KIMI_API_KEY', 'sk-kimi-fallback');
    const req = makeReq({ authorization: 'Bearer some-other' });
    expect(proxyAuth(req)).toEqual({
      key: 'sk-kimi-fallback',
      provider: 'kimi',
      source: 'app',
    });
  });

  it('Authorization without sk- prefix + cookie present → still env fallback (cookie ignored)', () => {
    vi.stubEnv('KIMI_API_KEY', 'sk-kimi-fallback');
    const req = makeReq({
      authorization: 'Bearer not-an-sk-key',
      cookie: 'kanshan-provider=deepseek',
    });
    const result = proxyAuth(req);
    expect(result.source).toBe('app');
    expect(result.provider).toBe('kimi');
  });
});
