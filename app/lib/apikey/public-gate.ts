// Public-mode gate. When the deployment is shared with anonymous visitors
// (e.g. judges / general public during 2026-05-12 to 2026-05-16), we don't
// want them burning the project's own KIMI / DEEPSEEK credits. So:
//
//   - `KANSHAN_PUBLIC_MODE=byo-or-cache` (env)         → public-mode active
//   - request has `Authorization: Bearer sk-...`        → live AI with their key
//   - request has cookie `kanshan-mode=cache`           → cache-only replay
//   - neither                                           → cache-only replay (default)
//
// `proxyAuth` returns `source: 'gated'` when this gate fires; the route then
// passes `mode: 'cache-only'` to `withCache` so the live LLM call is skipped.

export function isPublicModeActive(): boolean {
  return process.env.KANSHAN_PUBLIC_MODE === 'byo-or-cache';
}

function hasBearerKey(req: Request): boolean {
  const auth = req.headers.get('authorization');
  return !!auth && /^bearer\s+sk-/i.test(auth);
}

function hasCacheCookie(req: Request): boolean {
  const cookie = req.headers.get('cookie') ?? '';
  return /(?:^|;\s*)kanshan-mode=cache\b/.test(cookie);
}

/**
 * Returns the cache mode this request should be served under.
 * - 'cache-only' = no live LLM call; lookup or fail soft
 * - undefined   = no override; existing CACHE_MODE env / per-call default wins
 */
export function effectiveCacheMode(req: Request): 'cache-only' | undefined {
  if (!isPublicModeActive()) return undefined;
  if (hasBearerKey(req)) return undefined;
  // public mode + no BYO key → cache-only (whether they picked cache or just
  // landed on the page without dismissing onboarding)
  return 'cache-only';
}

/**
 * True when this request must NOT trigger a live LLM call.
 * Use this at the very top of a route handler to short-circuit before any
 * downstream work.
 */
export function mustUseCacheOnly(req: Request): boolean {
  return effectiveCacheMode(req) === 'cache-only';
}

/**
 * True when the public gate would refuse this request — meant for friendly
 * error messages in SSE events / toasts.
 */
export function isAnonInPublicMode(req: Request): boolean {
  return isPublicModeActive() && !hasBearerKey(req) && !hasCacheCookie(req);
}
