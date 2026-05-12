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

describe('POST /api/vault/ingest', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_DB_URL', '');
    vi.stubEnv('SILICONFLOW_API_KEY', '');
  });

  it('returns 200 with mock source when env unset', async () => {
    const req = makeReq({
      markdown: '# 测试\n\n这是一段正文，包含足够字符用于分块测试。'.repeat(3),
      title: '我的导入稿',
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { source: string; chunks: number; title: string };
    expect(data.source).toBe('mock');
    expect(data.title).toBe('我的导入稿');
    expect(typeof data.chunks).toBe('number');
  });

  it('returns 400 on missing markdown', async () => {
    const req = makeReq({ title: 'x' });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 on missing title', async () => {
    const req = makeReq({ markdown: 'x' });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid JSON', async () => {
    const req = makeReq('{not json', {});
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it('returns 413 when content-length exceeds 1MB', async () => {
    const req = new Request('http://localhost/api/vault/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'content-length': String(2 * 1024 * 1024) },
      body: JSON.stringify({ markdown: 'x', title: 'y' }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(413);
  });

  it('respects x-kanshan-account header in id namespacing', async () => {
    const req = makeReq(
      { markdown: 'hello world test content '.repeat(20), title: 't' },
      { 'x-kanshan-account': 'guwanxi' },
    );
    const res = await POST(req as never);
    const data = (await res.json()) as { id: string };
    expect(data.id.startsWith('guwanxi-')).toBe(true);
  });
});
