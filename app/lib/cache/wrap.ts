// withCache wrapper — the integration point for every agent that should
// participate in the demo cache. Resolves mode from env + per-call override.

import { lookupCache, writeCache, type CacheKind } from './store';

export type CacheMode = 'auto' | 'cache-only' | 'live-only';

export interface WithCacheOptions {
  mode?: CacheMode; // per-call override (e.g. /live forces 'cache-only')
}

export class CacheMissError extends Error {
  readonly kind: CacheKind;
  readonly intent: string;
  constructor(kind: CacheKind, intent: string) {
    super(`cache-miss in cache-only mode: ${kind} :: ${intent.slice(0, 80)}`);
    this.name = 'CacheMissError';
    this.kind = kind;
    this.intent = intent;
  }
}

function envMode(): CacheMode {
  const m = process.env.CACHE_MODE;
  if (m === 'cache-only' || m === 'live-only' || m === 'auto') return m;
  return 'auto';
}

// In-flight dedup: identical concurrent intents share a single live call.
// Keyed by `${kind}::${intent}`.
const inflight = new Map<string, Promise<unknown>>();

export async function withCache<T>(
  kind: CacheKind,
  intent: string,
  live: () => Promise<T>,
  opts: WithCacheOptions = {},
): Promise<T> {
  const mode = opts.mode ?? envMode();

  const key = `${kind}::${intent}`;
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    try {
      if (mode !== 'live-only') {
        try {
          const hit = await lookupCache<T>(kind, intent);
          if (hit) return hit.response;
        } catch (err) {
          // cache-only mode can't tolerate a broken lookup — caller wants strict
          // cache-replay semantics, so propagate.
          if (mode === 'cache-only') throw err;
          // auto mode: embedding service down, schema mismatch, or other lookup
          // failure. Degrade to live call rather than 500. The write below will
          // silently fail too, which is acceptable.
          console.warn('[cache] lookup failed, falling through to live:', (err as Error).message);
        }
      }
      if (mode === 'cache-only') {
        throw new CacheMissError(kind, intent);
      }
      const result = await live();
      // Best-effort write; tolerate sync mocks returning undefined and embed outages.
      Promise.resolve(writeCache(kind, intent, result)).catch((e) => {
        console.warn('[cache] write failed', e);
      });
      return result;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
}

// Helper for route handlers: read the per-request override from a header.
export function modeFromHeaders(headers: Headers): CacheMode | undefined {
  const v = headers.get('x-kanshan-cache-mode');
  if (v === 'cache-only' || v === 'live-only' || v === 'auto') return v;
  return undefined;
}
