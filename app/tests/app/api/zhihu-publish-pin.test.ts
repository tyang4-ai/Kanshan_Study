import { describe, it, expect, vi, beforeEach } from 'vitest';

// S7-B2 (2026-05-11): /api/zhihu/publish-pin route is a thin pass-through over
// publishPin(). Mock the zhihu lib so the route's own logic (validation +
// scrubbing + ring whitelist) is what's covered here, not the live API.

vi.mock('@/lib/zhihu', async () => {
  return {
    publishPin: vi.fn(),
    DEFAULT_RING_ID: '2029619126742656657',
    SUPPORTED_RING_IDS: [
      { id: '2001009660925334090', name: 'OpenClaw 人类观察员' },
      { id: '2015023739549529606', name: 'A2A for Reconnect' },
      { id: '2029619126742656657', name: '黑客松脑洞补给站' },
    ] as const,
  };
});

import { publishPin } from '@/lib/zhihu';
import * as routeMod from '@/app/api/zhihu/publish-pin/route';

const mocked = vi.mocked(publishPin);

function req(body: unknown): Request {
  return new Request('http://localhost/api/zhihu/publish-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocked.mockResolvedValue({ pin_id: 'mock-pin-1' });
});

describe('POST /api/zhihu/publish-pin', () => {
  it('happy path: valid content + valid ring → 200 + result', async () => {
    const res = await routeMod.POST(
      req({ content: '影像组学正在悄然转向 #知乎黑客松', ringId: '2029619126742656657' }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; result: unknown; ringId: string };
    expect(json.ok).toBe(true);
    expect(json.ringId).toBe('2029619126742656657');
    expect(mocked).toHaveBeenCalledWith(
      '影像组学正在悄然转向 #知乎黑客松',
      '2029619126742656657',
    );
  });

  it('defaults to DEFAULT_RING_ID when ringId omitted', async () => {
    const res = await routeMod.POST(req({ content: 'hello' }));
    expect(res.status).toBe(200);
    expect(mocked).toHaveBeenCalledWith('hello', '2029619126742656657');
  });

  it('coerces unknown ringId to DEFAULT_RING_ID (whitelist enforced)', async () => {
    // R8 adversarial defense: caller can't push to an arbitrary ring by injecting
    // a non-whitelisted ID. Falls back to default silently.
    const res = await routeMod.POST(req({ content: 'hello', ringId: '99999-rogue' }));
    expect(res.status).toBe(200);
    expect(mocked).toHaveBeenCalledWith('hello', '2029619126742656657');
  });

  it('400 on missing content', async () => {
    const res = await routeMod.POST(req({ ringId: '2029619126742656657' }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe('content required');
    expect(mocked).not.toHaveBeenCalled();
  });

  it('400 on whitespace-only content (trimmed = empty)', async () => {
    const res = await routeMod.POST(req({ content: '   \n  ' }));
    expect(res.status).toBe(400);
    expect(mocked).not.toHaveBeenCalled();
  });

  it('400 on content > 4000 chars', async () => {
    const res = await routeMod.POST(req({ content: 'a'.repeat(4001) }));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: string };
    expect(json.error).toContain('too long');
    expect(mocked).not.toHaveBeenCalled();
  });

  it('400 on malformed JSON', async () => {
    const res = await routeMod.POST(req('{not-json'));
    expect(res.status).toBe(400);
    expect(mocked).not.toHaveBeenCalled();
  });

  it('502 + scrubbed message when publishPin throws with secret-shaped key', async () => {
    mocked.mockRejectedValue(new Error('upstream auth failed: sk-FAKE0000FAKE0000FAKE0000FAKE0000'));
    const res = await routeMod.POST(req({ content: 'hello' }));
    expect(res.status).toBe(502);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    // Scrub kicks in: sk- shape redacted (substring), surrounding context kept.
    expect(json.error).not.toMatch(/sk-FAKE0000/);
    expect(json.error).toContain('[redacted]');
  });

  it('502 on Code != 0 errors (Zhihu API rejection)', async () => {
    mocked.mockRejectedValue(new Error('Zhihu /openapi/pin/publish Code=403 not authorized'));
    const res = await routeMod.POST(req({ content: 'hello' }));
    expect(res.status).toBe(502);
    const json = (await res.json()) as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    // Error context preserved (no API-key shape in the message → passes through).
    expect(json.error).toContain('Zhihu');
  });

  // Phase #15.8 Track 5: GB 45438 「AI 辅助生成」 trailer.
  describe('GB 45438 AI-assisted trailer', () => {
    it('appends trailer when aiAssisted:true (signed content reaches publishPin)', async () => {
      const res = await routeMod.POST(req({ content: '影像组学正在悄然转向', aiAssisted: true }));
      expect(res.status).toBe(200);
      const json = (await res.json()) as { ok: boolean; content: string };
      expect(json.content.endsWith('本文由看山书房 AI 辅助生成 · GB 45438')).toBe(true);
      const calledWith = mocked.mock.calls[0]?.[0] ?? '';
      expect(calledWith.endsWith('本文由看山书房 AI 辅助生成 · GB 45438')).toBe(true);
    });

    it('is idempotent: trailer appears exactly once even on repeat POSTs', async () => {
      const draft = 'hello world';
      const trailer = '\n\n———\n本文由看山书房 AI 辅助生成 · GB 45438';

      const first = await routeMod.POST(req({ content: draft, aiAssisted: true }));
      const firstJson = (await first.json()) as { content: string };
      expect(firstJson.content).toBe(draft + trailer);

      // Simulate a client retry sending the already-signed content back.
      const second = await routeMod.POST(req({ content: firstJson.content, aiAssisted: true }));
      const secondJson = (await second.json()) as { content: string };
      // Count occurrences of the marker — must be exactly 1.
      const matches = secondJson.content.match(/GB 45438/g) ?? [];
      expect(matches.length).toBe(1);
    });

    it('does NOT append trailer when aiAssisted field omitted (backward compat)', async () => {
      const res = await routeMod.POST(req({ content: 'plain content' }));
      expect(res.status).toBe(200);
      const json = (await res.json()) as { content: string };
      expect(json.content).toBe('plain content');
      expect(json.content).not.toContain('GB 45438');
      expect(mocked).toHaveBeenCalledWith('plain content', '2029619126742656657');
    });

    it('does NOT append trailer when aiAssisted:false', async () => {
      const res = await routeMod.POST(req({ content: 'plain content', aiAssisted: false }));
      expect(res.status).toBe(200);
      const json = (await res.json()) as { content: string };
      expect(json.content).not.toContain('GB 45438');
    });
  });
});
