import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { signZhihuRequest, buildZhihuSignString } from '@/lib/zhihu/sign';

describe('signZhihuRequest', () => {
  it('builds the canonical sign string with empty extra_info trailing colon', () => {
    const s = buildZhihuSignString('foo', '1700000000', 'log-1', '');
    expect(s).toBe('app_key:foo|ts:1700000000|logid:log-1|extra_info:');
  });

  it('builds the canonical sign string with extra_info value', () => {
    const s = buildZhihuSignString('foo', '1700000000', 'log-1', 'bar');
    expect(s).toBe('app_key:foo|ts:1700000000|logid:log-1|extra_info:bar');
  });

  it('produces deterministic HMAC-SHA256-Base64 for fixed inputs (golden)', () => {
    const headers = signZhihuRequest('test_app_key', 'test_app_secret', {
      timestamp: 1700000000,
      logId: 'log-1',
      extraInfo: '',
    });
    // Compute expected via raw crypto to guard against accidental algorithm changes.
    const expected = createHmac('sha256', 'test_app_secret')
      .update('app_key:test_app_key|ts:1700000000|logid:log-1|extra_info:')
      .digest('base64');
    expect(headers['X-Sign']).toBe(expected);
    expect(headers['X-App-Key']).toBe('test_app_key');
    expect(headers['X-Timestamp']).toBe('1700000000');
    expect(headers['X-Log-Id']).toBe('log-1');
    expect(headers['X-Extra-Info']).toBe('');
  });

  it('auto-generates log id when not provided', () => {
    const a = signZhihuRequest('k', 's', { timestamp: 1700000000 });
    const b = signZhihuRequest('k', 's', { timestamp: 1700000000 });
    expect(a['X-Log-Id']).not.toBe(b['X-Log-Id']);
    expect(a['X-Log-Id']).toMatch(/^kanshan-[0-9a-f]{16}$/);
  });

  it('different secrets produce different signatures (sanity)', () => {
    const a = signZhihuRequest('k', 's1', { timestamp: 1, logId: 'x' });
    const b = signZhihuRequest('k', 's2', { timestamp: 1, logId: 'x' });
    expect(a['X-Sign']).not.toBe(b['X-Sign']);
  });

  it('different timestamps produce different signatures', () => {
    const a = signZhihuRequest('k', 's', { timestamp: 1, logId: 'x' });
    const b = signZhihuRequest('k', 's', { timestamp: 2, logId: 'x' });
    expect(a['X-Sign']).not.toBe(b['X-Sign']);
  });
});
