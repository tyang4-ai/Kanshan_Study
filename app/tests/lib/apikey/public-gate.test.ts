import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isPublicModeActive,
  effectiveCacheMode,
  mustUseCacheOnly,
  isAnonInPublicMode,
} from '@/lib/apikey/public-gate';
import { proxyAuth } from '@/lib/apikey/proxy';

function makeReq(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/x', { method: 'POST', headers });
}

describe('public-gate', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  describe('isPublicModeActive', () => {
    it('false when env unset', () => {
      vi.stubEnv('KANSHAN_PUBLIC_MODE', '');
      expect(isPublicModeActive()).toBe(false);
    });
    it('true when env=byo-or-cache', () => {
      vi.stubEnv('KANSHAN_PUBLIC_MODE', 'byo-or-cache');
      expect(isPublicModeActive()).toBe(true);
    });
    it('false for unrecognized values', () => {
      vi.stubEnv('KANSHAN_PUBLIC_MODE', 'cache-only');
      expect(isPublicModeActive()).toBe(false);
    });
  });

  describe('effectiveCacheMode', () => {
    it('returns undefined when public mode off', () => {
      vi.stubEnv('KANSHAN_PUBLIC_MODE', '');
      expect(effectiveCacheMode(makeReq())).toBeUndefined();
    });
    it('returns undefined when BYO key present (even in public mode)', () => {
      vi.stubEnv('KANSHAN_PUBLIC_MODE', 'byo-or-cache');
      expect(effectiveCacheMode(makeReq({ authorization: 'Bearer sk-abc123' }))).toBeUndefined();
    });
    it('forces cache-only in public mode without BYO', () => {
      vi.stubEnv('KANSHAN_PUBLIC_MODE', 'byo-or-cache');
      expect(effectiveCacheMode(makeReq())).toBe('cache-only');
    });
    it('cache cookie alone also yields cache-only', () => {
      vi.stubEnv('KANSHAN_PUBLIC_MODE', 'byo-or-cache');
      expect(
        effectiveCacheMode(makeReq({ cookie: 'kanshan-mode=cache; kanshan-account=guwanxi' })),
      ).toBe('cache-only');
    });
  });

  describe('mustUseCacheOnly', () => {
    it('mirrors effectiveCacheMode === cache-only', () => {
      vi.stubEnv('KANSHAN_PUBLIC_MODE', 'byo-or-cache');
      expect(mustUseCacheOnly(makeReq())).toBe(true);
      expect(mustUseCacheOnly(makeReq({ authorization: 'Bearer sk-abc' }))).toBe(false);
    });
  });

  describe('isAnonInPublicMode', () => {
    it('false when public mode off', () => {
      vi.stubEnv('KANSHAN_PUBLIC_MODE', '');
      expect(isAnonInPublicMode(makeReq())).toBe(false);
    });
    it('true when public mode on + no Bearer + no cache cookie', () => {
      vi.stubEnv('KANSHAN_PUBLIC_MODE', 'byo-or-cache');
      expect(isAnonInPublicMode(makeReq())).toBe(true);
    });
    it('false when user has cache cookie (they made a choice)', () => {
      vi.stubEnv('KANSHAN_PUBLIC_MODE', 'byo-or-cache');
      expect(isAnonInPublicMode(makeReq({ cookie: 'kanshan-mode=cache' }))).toBe(false);
    });
  });
});

describe('proxyAuth × public-mode interplay', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('KANSHAN_PUBLIC_MODE', '');
    vi.stubEnv('KIMI_API_KEY', 'app-side-kimi-key');
    vi.stubEnv('DEEPSEEK_API_KEY', '');
  });

  it('BYO key always wins, regardless of public mode', () => {
    vi.stubEnv('KANSHAN_PUBLIC_MODE', 'byo-or-cache');
    const creds = proxyAuth(makeReq({ authorization: 'Bearer sk-byo-1234567890abc' }));
    expect(creds.source).toBe('user');
    expect(creds.key).toBe('sk-byo-1234567890abc');
  });

  it('public mode + no BYO ⇒ gated source with empty key', () => {
    vi.stubEnv('KANSHAN_PUBLIC_MODE', 'byo-or-cache');
    const creds = proxyAuth(makeReq());
    expect(creds.source).toBe('gated');
    expect(creds.key).toBe('');
  });

  it('self-hosted mode + no BYO ⇒ app key falls through (legacy behavior)', () => {
    vi.stubEnv('KANSHAN_PUBLIC_MODE', '');
    const creds = proxyAuth(makeReq());
    expect(creds.source).toBe('app');
    expect(creds.key).toBe('app-side-kimi-key');
  });

  it('public mode + no BYO + provider cookie ⇒ provider honored on gated', () => {
    vi.stubEnv('KANSHAN_PUBLIC_MODE', 'byo-or-cache');
    const creds = proxyAuth(makeReq({ cookie: 'kanshan-provider=deepseek' }));
    expect(creds.source).toBe('gated');
    expect(creds.provider).toBe('deepseek');
  });
});
