import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Resolves a /public-relative path (e.g. '/art/lore/huts/shan.png') to a
// disk path under the Next.js public directory, then checks existence.
//
// Works at runtime on Vercel because `public/` is bundled into the deployment
// filesystem alongside .next; we resolve relative to process.cwd() which is
// the deployed app root.
//
// Server-only — do NOT import from a 'use client' component. Use the helper
// from a Server Component (or pass the resolved URL down as a prop).

const PUBLIC_DIR = 'public';
const cache = new Map<string, boolean>();

export function assetExists(publicPath: string): boolean {
  if (typeof publicPath !== 'string' || !publicPath.startsWith('/')) return false;
  if (cache.has(publicPath)) return cache.get(publicPath)!;
  const diskPath = join(process.cwd(), PUBLIC_DIR, publicPath.replace(/^\//, ''));
  const exists = existsSync(diskPath);
  cache.set(publicPath, exists);
  return exists;
}

export function pickAssetUrl(publicPath: string): string | null {
  return assetExists(publicPath) ? publicPath : null;
}

// Test helper: clear the cache between tests so file-system state changes
// during test runs are visible. NOT exported under the production-import
// path; tests use a dynamic-import-then-reset trick OR call this directly.
export function __resetAssetCache(): void {
  cache.clear();
}
