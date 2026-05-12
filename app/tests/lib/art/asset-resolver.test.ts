import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { assetExists, pickAssetUrl, __resetAssetCache } from '@/lib/art/asset-resolver';

const FIXTURE_PATH = '/art/__test_fixture__.png';
const DISK = join(process.cwd(), 'public', 'art', '__test_fixture__.png');

beforeEach(() => { __resetAssetCache(); });
afterEach(() => {
  __resetAssetCache();
  if (existsSync(DISK)) unlinkSync(DISK);
});

describe('asset-resolver', () => {
  it('assetExists returns false for missing file', () => {
    expect(assetExists('/art/__definitely_not_present__.png')).toBe(false);
  });

  it('assetExists returns true after creating the file', () => {
    mkdirSync(join(process.cwd(), 'public', 'art'), { recursive: true });
    writeFileSync(DISK, '');
    __resetAssetCache();
    expect(assetExists(FIXTURE_PATH)).toBe(true);
  });

  it('pickAssetUrl returns null when missing', () => {
    expect(pickAssetUrl('/art/__definitely_not_present__.png')).toBeNull();
  });

  it('pickAssetUrl returns the path when present', () => {
    mkdirSync(join(process.cwd(), 'public', 'art'), { recursive: true });
    writeFileSync(DISK, '');
    __resetAssetCache();
    expect(pickAssetUrl(FIXTURE_PATH)).toBe(FIXTURE_PATH);
  });

  it('rejects non-/-prefixed paths', () => {
    expect(assetExists('art/no-leading-slash.png')).toBe(false);
    expect(assetExists('')).toBe(false);
  });

  it('caches existence result', () => {
    expect(assetExists('/art/__cache_test__.png')).toBe(false);
    // create the file but DON'T reset cache — assertion should still be false
    mkdirSync(join(process.cwd(), 'public', 'art'), { recursive: true });
    const cachePath = join(process.cwd(), 'public', 'art', '__cache_test__.png');
    writeFileSync(cachePath, '');
    try {
      expect(assetExists('/art/__cache_test__.png')).toBe(false); // still cached
      __resetAssetCache();
      expect(assetExists('/art/__cache_test__.png')).toBe(true); // post-reset reads fresh
    } finally {
      if (existsSync(cachePath)) unlinkSync(cachePath);
    }
  });
});
