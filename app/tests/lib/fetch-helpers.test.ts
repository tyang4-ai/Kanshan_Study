import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchWithErrorToast } from '@/lib/fetch-helpers';
import { useAiErrorStore } from '@/lib/store/ai-error';

describe('fetchWithErrorToast', () => {
  beforeEach(() => {
    useAiErrorStore.setState({ current: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the original response unchanged on 2xx', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    const res = await fetchWithErrorToast('/api/agents/voice-fill', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(useAiErrorStore.getState().current).toBeNull();
  });

  it('pushes to ai-error store on non-OK status', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response);
    await fetchWithErrorToast('/api/agents/voice-fill');
    const err = useAiErrorStore.getState().current;
    expect(err).not.toBeNull();
    expect(err!.status).toBe(500);
    expect(err!.message).toContain('LLM 服务暂时不可用');
  });

  it('pushes to ai-error store on network failure (non-abort)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('NetworkError'));
    await expect(
      fetchWithErrorToast('/api/agents/persona-panel'),
    ).rejects.toThrow();
    expect(useAiErrorStore.getState().current).not.toBeNull();
  });

  it('does NOT push when the request was aborted', async () => {
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
    global.fetch = vi.fn().mockRejectedValue(abortErr);
    await expect(fetchWithErrorToast('/api/x')).rejects.toThrow();
    expect(useAiErrorStore.getState().current).toBeNull();
  });

  it('replaces (not stacks) on consecutive failures', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response);
    await fetchWithErrorToast('/api/x');
    await fetchWithErrorToast('/api/y');
    // Still single-slot — only ONE current.
    const err = useAiErrorStore.getState().current;
    expect(err).not.toBeNull();
    expect(err!.url).toBe('/api/y');
  });
});
