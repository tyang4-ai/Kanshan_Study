import { describe, it, expect } from 'vitest';
import { scrubErrorForClient } from '@/lib/errors/scrub';

// R6 security review (Hu Wei) P1: scrubErrorForClient had no direct unit tests
// — coverage was only by-proxy through four route tests with one happy-path
// assertion each. Pin the full secret-pattern matrix here so future edits to
// SECRET_PATTERNS can't accidentally regress the chokepoint.

const GENERIC = '上游服务暂不可用';

describe('scrubErrorForClient — secret family matrix', () => {
  // Each row: (label, input, expected). expected === GENERIC means "must be scrubbed".
  const cases: Array<[label: string, input: string, expected: string]> = [
    ['Kimi/OpenAI/DeepSeek sk- key',                'auth failed: sk-FAKE0000FAKE0000FAKE0000FAKE0000', GENERIC],
    ['Anthropic sk-ant- key',                       'sk-ant-abcdef1234567890abcdef1234567890',           GENERIC],
    ['Cloudflare cfat_ token',                       'cfat_FAKE0000FAKE0000FAKE0000FAKE0000FAKE0000FAKE0000 leaked', GENERIC],
    ['Vercel vcp_ token',                            'oops: vcp_FAKE0000FAKE0000FAKE0000FAKE0000FAKE0000FAKE0000', GENERIC],
    ['Vercel vck_ token',                            'oops: vck_FAKE0000FAKE0000FAKE0000FAKE0000', GENERIC],
    ['GitHub ghp_ PAT',                              'fetch failed with ghp_abcdefghij1234567890abcdef',  GENERIC],
    ['GitHub gho_ OAuth',                            'gho_abcdefghij1234567890abcdefghij',                GENERIC],
    ['AWS AKIA access key',                          'AKIAFAKE000000EXAMPL invalid',                      GENERIC],
    ['Supabase JWT pair',                            'jwt: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.s', GENERIC],
    ['Zhihu X2L Bearer (uppercase)',                 'X2LFAKE0000FAKE0000FAKE00000FAKE rejected',         GENERIC],
    ['Zhihu X2L Bearer (lowercase via /i flag)',     'x2lfake0000fake0000fake00000fake rejected',         GENERIC],
    ['raw env-name "API_KEY"',                       'API_KEY is not set',                                GENERIC],
    ['raw env-name "DEEPSEEK_API_KEY" with space',   'DEEPSEEK_API_KEY is not set',                       GENERIC],
    ['raw env-name "KIMI_API_KEY"',                  'KIMI_API_KEY missing in env',                       GENERIC],
    ['raw env-name "api-key"',                       'api-key invalid',                                   GENERIC],
    ['"Bearer" mention',                             'Bearer token rejected',                             GENERIC],
    ['"access_token" mention',                       'access_token expired',                              GENERIC],
    ['"access-token" mention',                       'access-token expired',                              GENERIC],
    ['the word "secret" alone',                      'invalid secret arg',                                GENERIC],
    ['Long base64 blob (32+ chars)',                 'AbCdEfGhIjKlMnOpQrStUvWxYz123456',                  GENERIC],
  ];

  it.each(cases)('scrubs %s', (_label, input, expected) => {
    expect(scrubErrorForClient(input)).toBe(expected);
  });
});

describe('scrubErrorForClient — non-secret messages pass through (possibly truncated)', () => {
  it('keeps short benign messages unchanged', () => {
    expect(scrubErrorForClient('段落太短')).toBe('段落太短');
  });

  it('returns generic fallback on empty input', () => {
    expect(scrubErrorForClient('')).toBe(GENERIC);
  });

  it('returns generic fallback on undefined-typed input', () => {
    // Defensive: route handlers can pass arbitrary strings; guard against
    // non-string values that slipped past TypeScript at runtime.
    expect(scrubErrorForClient(undefined as unknown as string)).toBe(GENERIC);
  });

  it('truncates long messages above 200 chars with an ellipsis', () => {
    const longButSafe = '上游错误描述'.repeat(60); // ~360 chars of safe Chinese text
    const out = scrubErrorForClient(longButSafe);
    expect(out.length).toBeLessThanOrEqual(201);
    expect(out.endsWith('…')).toBe(true);
  });

  it('scrubs even when the secret is buried mid-string', () => {
    expect(scrubErrorForClient(`prefix ${'sk-'}abcdefghij1234567890 suffix`)).toBe(GENERIC);
  });

  it('scrubs multi-line messages with one secret line', () => {
    const multiline = ['line 1 ok', 'line 2 also ok', 'leak: cfat_FAKE0000FAKE0000FAKE0000FAKE0000FAKE0000FAKE0000', 'line 4'].join('\n');
    expect(scrubErrorForClient(multiline)).toBe(GENERIC);
  });
});

describe('scrubErrorForClient — known false-negatives (documented limits)', () => {
  // Hu Wei flagged these — short truncations may slip through the {6,} length
  // gate. Documented so future tightening of the regex is testable.

  it('does NOT scrub a 5-char-truncated sk- prefix (under length gate)', () => {
    // This is intentionally permissive — `sk-X` alone is too short to be a
    // real key. The 'bearer' / 'secret' / 'api[_-]key' family catches the
    // common 401 message shapes.
    expect(scrubErrorForClient('sk-12345')).not.toBe(GENERIC);
  });
});
