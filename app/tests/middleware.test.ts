import { describe, it, expect } from 'vitest';
import { middleware } from '@/middleware';
import type { NextRequest } from 'next/server';

function makeReq(opts: { cookieHeader?: string; xff?: string; ua?: string }): NextRequest {
  const headers = new Headers();
  if (opts.xff) headers.set('x-forwarded-for', opts.xff);
  if (opts.ua) headers.set('user-agent', opts.ua);
  if (opts.cookieHeader) headers.set('cookie', opts.cookieHeader);
  return {
    headers,
    cookies: {
      get(name: string) {
        if (!opts.cookieHeader) return undefined;
        const m = opts.cookieHeader.match(new RegExp(`${name}=([^;]+)`));
        return m ? { value: m[1] } : undefined;
      },
    },
  } as unknown as NextRequest;
}

describe('middleware', () => {
  it('sets kanshan-guest-id cookie on first request', async () => {
    const req = makeReq({ xff: '1.2.3.4', ua: 'Mozilla' });
    const res = await middleware(req);
    expect(res.cookies.get('kanshan-guest-id')?.value).toMatch(/^[a-f0-9]{12}$/);
  });

  it('does not set cookie if already present', async () => {
    const req = makeReq({ cookieHeader: 'kanshan-guest-id=abc123def456' });
    const res = await middleware(req);
    expect(res.cookies.get('kanshan-guest-id')).toBeUndefined();
  });

  it('falls back to x-real-ip if x-forwarded-for is missing', async () => {
    const headers = new Headers();
    headers.set('x-real-ip', '5.6.7.8');
    headers.set('user-agent', 'Mozilla');
    const req = {
      headers,
      cookies: { get: () => undefined },
    } as unknown as NextRequest;
    const res = await middleware(req);
    expect(res.cookies.get('kanshan-guest-id')?.value).toMatch(/^[a-f0-9]{12}$/);
  });

  it('still sets a cookie when no headers are present', async () => {
    const req = makeReq({});
    const res = await middleware(req);
    expect(res.cookies.get('kanshan-guest-id')?.value).toMatch(/^[a-f0-9]{12}$/);
  });
});
