import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '@/app/api/vault/ingest/route';

function makeReq(body: unknown, headers: Record<string, string> = {}): Request {
  const json = typeof body === 'string' ? body : JSON.stringify(body);
  return new Request('http://localhost/api/vault/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: json,
  });
}

describe('POST /api/vault/ingest · vault consent gate', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_DB_URL', '');
    vi.stubEnv('SILICONFLOW_API_KEY', '');
  });

  it('returns 403 for `me` account without x-kanshan-vault-consent header', async () => {
    const req = makeReq(
      { markdown: 'hello world '.repeat(20), title: 't' },
      { 'x-kanshan-account': 'me' },
    );
    const res = await POST(req as never);
    expect(res.status).toBe(403);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('档案库未开通 — 请在设置中同意条款');
  });

  it('returns 403 when x-kanshan-vault-consent=0 for non-guwanxi accounts', async () => {
    const req = makeReq(
      { markdown: 'hello world '.repeat(20), title: 't' },
      { 'x-kanshan-account': 'me', 'x-kanshan-vault-consent': '0' },
    );
    const res = await POST(req as never);
    expect(res.status).toBe(403);
  });

  it('returns 403 when no account header (defaults to `me`) and no consent header', async () => {
    const req = makeReq({ markdown: 'hello world '.repeat(20), title: 't' });
    const res = await POST(req as never);
    expect(res.status).toBe(403);
  });

  it('proceeds when x-kanshan-vault-consent=1 for `me`', async () => {
    const req = makeReq(
      { markdown: 'hello world '.repeat(20), title: 't' },
      { 'x-kanshan-account': 'me', 'x-kanshan-vault-consent': '1' },
    );
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { source: string; title: string };
    expect(data.source).toBe('mock');
    expect(data.title).toBe('t');
  });

  it('proceeds for `guwanxi` without any consent header (showcase exception)', async () => {
    const req = makeReq(
      { markdown: 'hello world '.repeat(20), title: 't' },
      { 'x-kanshan-account': 'guwanxi' },
    );
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { id: string };
    expect(data.id.startsWith('guwanxi-')).toBe(true);
  });
});
