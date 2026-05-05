// Convenience wrapper called by API route handlers.
// Reads cookie, reads Authorization header for BYO key bypass, calls
// checkAndIncrement, returns either null (ok) or a Response (429).

import { cookies } from 'next/headers';
import { checkAndIncrement, releaseConcurrent } from './store';

export async function requireRateLimitOk(req: Request): Promise<Response | null> {
  const auth = req.headers.get('authorization');
  if (auth && auth.toLowerCase().startsWith('bearer sk-')) {
    return null;
  }
  const cookieStore = await cookies();
  const guestId = cookieStore.get('kanshan-guest-id')?.value;
  if (!guestId) return null;
  const result = await checkAndIncrement(guestId);
  if (result.ok) return null;
  return new Response(
    JSON.stringify({ error: 'rate-limit', mode: result.mode, resetAt: result.resetAt }),
    { status: 429, headers: { 'Content-Type': 'application/json' } },
  );
}

export { releaseConcurrent };
