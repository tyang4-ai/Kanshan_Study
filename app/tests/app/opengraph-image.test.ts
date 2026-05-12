import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/art/asset-resolver', () => ({
  pickAssetUrl: vi.fn<(p: string) => string | null>(() => null),
}));

describe('opengraph-image route', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an ImageResponse (PNG) when /art/og.png is absent', async () => {
    vi.doMock('@/lib/art/asset-resolver', () => ({
      pickAssetUrl: vi.fn<(p: string) => string | null>(() => null),
    }));
    const mod = await import('@/app/opengraph-image');
    expect(mod.size).toEqual({ width: 1200, height: 630 });
    expect(mod.contentType).toBe('image/png');
    const res = await mod.default();
    // next/og ImageResponse extends Response with PNG content-type.
    const ct = (res.headers.get('Content-Type') ?? '').toLowerCase();
    expect(ct).toContain('image/png');
    expect(res.status).toBe(200);
  });
});
