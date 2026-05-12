import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/auth/zhihu/logout/route';

describe('POST /api/auth/zhihu/logout', () => {
  it('clears the session cookie and returns ok:true', async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
    const all = res.headers.getSetCookie?.() ?? [];
    const sessionClear = all.find((c) => c.startsWith('kanshan-zhihu-session='));
    expect(sessionClear).toBeDefined();
    expect(sessionClear).toMatch(/Max-Age=0/i);
  });
});
