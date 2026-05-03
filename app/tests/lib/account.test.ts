import { describe, it, expect } from 'vitest';
import { getCurrentUser } from '@/lib/account';

describe('getCurrentUser', () => {
  it('undefined req → me default', () => {
    const u = getCurrentUser();
    expect(u.id).toBe('me');
    expect(u.displayName).toBe('我');
  });

  it('header guwanxi → GU', () => {
    const req = new Request('http://x', { headers: { 'x-kanshan-account': 'guwanxi' } });
    const u = getCurrentUser(req);
    expect(u.id).toBe('guwanxi');
    expect(u.displayName).toBe('顾婉昔');
    expect(u.bio).toContain('演示账号');
  });

  it('invalid header value → me', () => {
    const req = new Request('http://x', { headers: { 'x-kanshan-account': 'invalid' } });
    expect(getCurrentUser(req).id).toBe('me');
  });

  it('missing header → me', () => {
    const req = new Request('http://x');
    expect(getCurrentUser(req).id).toBe('me');
  });
});
