import { describe, it, expect } from 'vitest';
import { scrubErrorForClient } from '@/lib/errors/scrub';

// R6 security review (Hu Wei) P1: scrubErrorForClient had no direct unit tests
// — coverage was only by-proxy through four route tests with one happy-path
// assertion each. Pin the full secret-pattern matrix here so future edits to
// SECRET_PATTERNS can't accidentally regress the chokepoint.

const GENERIC = '上游服务暂不可用';
const R = '[redacted]';

describe('scrubErrorForClient — secret family matrix (substring redaction)', () => {
  // Each row: (label, input, expectedContains[]).  Each expected fragment must
  // appear in the output. `R` (= "[redacted]") is the redaction marker.
  const cases: Array<[label: string, input: string, mustContain: string[], mustNotContain: string[]]> = [
    ['Kimi/OpenAI/DeepSeek sk- key',
      'auth failed: sk-FAKE0000FAKE0000FAKE0000FAKE0000', ['auth failed:', R], ['FAKE0000FAKE0000']],
    ['Anthropic sk-ant- key',
      'token=sk-ant-abcdef1234567890abcdef1234567890', ['token=', R], ['sk-ant-abcdef']],
    ['Cloudflare cfat_ token',
      'cfat_FAKE0000FAKE0000FAKE0000FAKE0000FAKE0000FAKE0000 leaked', [R, 'leaked'], ['cfat_FAKE']],
    ['Vercel vcp_ token',
      'oops: vcp_FAKE0000FAKE0000FAKE0000FAKE0000FAKE0000FAKE0000', ['oops:', R], ['vcp_FAKE']],
    ['Vercel vck_ token',
      'oops: vck_FAKE0000FAKE0000FAKE0000FAKE0000', ['oops:', R], ['vck_FAKE']],
    ['GitHub ghp_ PAT',
      'fetch failed with ghp_abcdefghij1234567890abcdef', ['fetch failed with', R], ['ghp_abcdef']],
    ['GitHub gho_ OAuth',
      'gho_abcdefghij1234567890abcdefghij found in body', [R, 'found in body'], ['gho_abcdef']],
    ['AWS AKIA access key',
      'AKIAFAKE000000EXAMPL invalid', [R, 'invalid'], ['AKIAFAKE']],
    ['Supabase JWT pair',
      'jwt error: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig123', ['jwt error:', R], ['eyJhbGc']],
    ['Zhihu X2L Bearer (uppercase)',
      'X2LFAKE0000FAKE0000FAKE00000FAKE rejected', [R, 'rejected'], ['X2LFAKE']],
    ['Zhihu X2L Bearer (lowercase via /i flag)',
      'x2lfake0000fake0000fake00000fake rejected', [R, 'rejected'], ['x2lfake0000']],
    ['raw env-name "DEEPSEEK_API_KEY"',
      'DEEPSEEK_API_KEY is not set', [R, 'is not set'], ['DEEPSEEK_API_KEY']],
    ['raw env-name "KIMI_API_KEY"',
      'KIMI_API_KEY missing in env', [R, 'missing in env'], ['KIMI_API_KEY']],
    ['raw env-name "SUPABASE_SERVICE_ROLE_KEY"',
      'SUPABASE_SERVICE_ROLE_KEY rotated', [R, 'rotated'], ['SUPABASE_SERVICE_ROLE_KEY']],
    ['Long base64 blob (40+ chars)',
      'opaque blob: AbCdEfGhIjKlMnOpQrStUvWxYz1234567890ABCDef', ['opaque blob:', R], ['AbCdEfGhIjKlMnOpQrStUvWxYz1234']],
  ];

  it.each(cases)('redacts %s', (_label, input, mustContain, mustNotContain) => {
    const out = scrubErrorForClient(input);
    for (const m of mustContain) {
      expect(out).toContain(m);
    }
    for (const m of mustNotContain) {
      expect(out).not.toContain(m);
    }
  });
});

describe('scrubErrorForClient — false-positive resistance (Jiang Hanzhi P0)', () => {
  // The old whole-message replacement scrubbed any string containing "api key"
  // or "secret" or "bearer" — including benign error messages. New policy only
  // redacts env-var-shaped tokens (e.g. DEEPSEEK_API_KEY), not arbitrary
  // mentions of the words, so these MUST pass through.
  it('keeps a Chinese error sentence containing the word "secret"', () => {
    const msg = '段落太长 — 内部参数 secret-stash 字符数超过 4000';
    expect(scrubErrorForClient(msg)).toBe(msg);
  });

  it('keeps a benign "bearer rate limit exceeded" message', () => {
    const msg = 'Bearer rate limit exceeded for this hour, retry at :00';
    // 'Bearer' as a casual word shouldn't trigger; only env-var shapes do.
    expect(scrubErrorForClient(msg)).toBe(msg);
  });

  it('keeps a Supabase row-not-found message with a short UUID fragment', () => {
    const msg = 'Supabase row not found: 8f3a-9d4e-4b';
    expect(scrubErrorForClient(msg)).toBe(msg);
  });

  it('keeps a medium-length Chinese explanation without secrets', () => {
    const msg = '影像组学领域正在悄然发生深刻转向，由单纯的图像特征提取转变为与基因组学的联合建模。';
    expect(scrubErrorForClient(msg)).toBe(msg);
  });

  it('keeps a 32-char alphanumeric run (no longer auto-redacted at 32)', () => {
    // 32 chars — under the new 40+ threshold, should pass through.
    expect(scrubErrorForClient('id=AbCdEfGhIjKlMnOpQrStUvWxYz123456')).toContain('AbCdEf');
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

  it('redacts the secret in place when buried mid-string', () => {
    const out = scrubErrorForClient(`prefix ${'sk-'}abcdefghij1234567890ABCDEFGH suffix`);
    expect(out).toContain('prefix');
    expect(out).toContain(R);
    expect(out).toContain('suffix');
    expect(out).not.toContain('sk-abcdefghij');
  });

  it('redacts the secret line but keeps the other lines in a multi-line message', () => {
    const multiline = ['line 1 ok', 'line 2 also ok', 'leak: cfat_FAKE0000FAKE0000FAKE0000FAKE0000FAKE0000FAKE0000', 'line 4'].join('\n');
    const out = scrubErrorForClient(multiline);
    expect(out).toContain('line 1 ok');
    expect(out).toContain('line 4');
    expect(out).toContain(R);
    expect(out).not.toContain('cfat_FAKE');
  });
});

describe('scrubErrorForClient — invisible-Unicode bypass defense (R8 Ren Bo P0)', () => {
  it('redacts a sk- key with a ZWSP (U+200B) interruption', () => {
    const input = `error: sk-aaaaaaaa​bbbbbbbbbbbbbbbbbbbb leaked`;
    const out = scrubErrorForClient(input);
    expect(out).toContain('error:');
    expect(out).toContain('leaked');
    expect(out).toContain('[redacted]');
    expect(out).not.toContain('sk-aaaaaaaa');
    expect(out).not.toContain('bbbbbbbb');
  });

  it('redacts a cfat_ token with a ZWNJ (U+200C) interruption (whole-message secret falls to generic)', () => {
    const input = `cfat_FAKE0000FAKE0000FAKE‌0000FAKE0000FAKE0000`;
    const out = scrubErrorForClient(input);
    // After stripping ZWNJ and redacting, only the [redacted] marker remains;
    // the meaningful-content guard falls back to the generic message.
    expect(out).not.toContain('cfat_FAKE');
    expect(out).not.toContain('FAKE0000FAKE0000');
  });

  it('redacts a key with a BOM (U+FEFF) interruption while keeping context', () => {
    const input = `key dump: sk-FAKE00000000﻿FAKE0000FAKE0000FAKE invalid`;
    const out = scrubErrorForClient(input);
    expect(out).toContain('key dump:');
    expect(out).toContain('invalid');
    expect(out).toContain('[redacted]');
  });

  it('redacts a key wrapped in bidi-override controls (U+202E / U+2066)', () => {
    const input = `‮sk-FAKE0000FAKE0000FAKE0000FAKE‬ end`;
    const out = scrubErrorForClient(input);
    expect(out).not.toContain('FAKE0000FAKE0000');
    expect(out).toContain('[redacted]');
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
