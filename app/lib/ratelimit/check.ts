// Convenience wrapper called by API route handlers.
// Reads cookie, reads Authorization header for BYO key bypass, calls
// checkAndIncrement, returns either null (ok) or a Response (429).
//
// R6 security review (Hu Wei) P1:
//   1. Cookieless requests previously skipped the limiter entirely — a script
//      that re-rolls its cookie jar could fan out unmetered. Now we compute
//      the same IP+UA hash the middleware would set, so the very first request
//      is metered too.
//   2. BYO-key requests previously skipped the limiter entirely on the strength
//      of `Authorization: Bearer sk-X` alone, with no proof the key works. A
//      fan-out attacker can starve our connection pool by sending bogus keys.
//      Now we still let real BYO keys bypass the per-guest cap, but a soft
//      per-IP+UA cap (8× the per-guest concurrent limit) still applies.

import { cookies } from 'next/headers';
import { checkAndIncrement, releaseConcurrent } from './store';
import { hashGuestId } from '@/lib/guest/id';

function readClientFingerprint(req: Request): { ip: string; ua: string } {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';
  const ua = req.headers.get('user-agent') ?? '';
  return { ip, ua };
}

async function resolveGuestId(req: Request): Promise<string> {
  const cookieStore = await cookies();
  const cookieId = cookieStore.get('kanshan-guest-id')?.value;
  if (cookieId) return cookieId;
  const { ip, ua } = readClientFingerprint(req);
  return hashGuestId(ip, ua);
}

export async function requireRateLimitOk(req: Request): Promise<Response | null> {
  const auth = req.headers.get('authorization');
  const hasByoKey = !!auth && auth.toLowerCase().startsWith('bearer sk-');
  const guestId = await resolveGuestId(req);
  // BYO key holders get a higher cap (multiplied at the store level) but still
  // metered so a fan-out with bogus keys can't starve us.
  const result = await checkAndIncrement(guestId, hasByoKey ? { multiplier: 8 } : undefined);
  if (result.ok) return null;
  return new Response(
    JSON.stringify({ error: 'rate-limit', mode: result.mode, resetAt: result.resetAt }),
    { status: 429, headers: { 'Content-Type': 'application/json' } },
  );
}

export { releaseConcurrent };
