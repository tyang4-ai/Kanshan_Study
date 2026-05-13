import { NextResponse, type NextRequest } from 'next/server';

// Per-browser guest identity. 16 random bytes → 32 hex chars. Set once on
// first visit, persists 1 year. The cookie is httpOnly so the browser is the
// only place the ID exists; server-side route handlers read it via
// `getAccountId()` and scope all DB queries by it. No auth, no signup —
// each browser is its own account, physically barred from other browsers'
// rows by the WHERE user_id = $id filter on every read.
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const existing = req.cookies.get('kanshan-guest-id')?.value;
  // Treat legacy 12-hex IP+UA hashes as missing — they're not unique per
  // browser (judges on the same Wi-Fi+browser collided). Force a re-issue
  // with truly random bytes.
  if (!existing || existing.length !== 32) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    let id = '';
    for (let i = 0; i < bytes.length; i++) id += bytes[i].toString(16).padStart(2, '0');
    res.cookies.set('kanshan-guest-id', id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
