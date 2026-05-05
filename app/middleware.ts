import { NextResponse, type NextRequest } from 'next/server';
import { hashGuestId } from '@/lib/guest/id';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const existing = req.cookies.get('kanshan-guest-id');
  if (!existing) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown';
    const ua = req.headers.get('user-agent') ?? '';
    const id = await hashGuestId(ip, ua);
    res.cookies.set('kanshan-guest-id', id, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
