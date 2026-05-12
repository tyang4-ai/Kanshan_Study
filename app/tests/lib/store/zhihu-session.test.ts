import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useZhihuSessionStore } from '@/lib/store/zhihu-session';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  useZhihuSessionStore.setState({
    uid: null,
    fullname: null,
    avatarPath: null,
    exp: null,
    hydrated: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useZhihuSessionStore', () => {
  it('hydrate() leaves nulls and sets hydrated=true when /me returns 401', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'not_authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await useZhihuSessionStore.getState().hydrate();
    const s = useZhihuSessionStore.getState();
    expect(s.uid).toBeNull();
    expect(s.fullname).toBeNull();
    expect(s.hydrated).toBe(true);
  });

  it('hydrate() populates fields when /me returns 200', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ uid: 42, fullname: '我', avatarPath: '/me.jpg', exp: Date.now() + 60_000 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    await useZhihuSessionStore.getState().hydrate();
    const s = useZhihuSessionStore.getState();
    expect(s.uid).toBe(42);
    expect(s.fullname).toBe('我');
    expect(s.avatarPath).toBe('/me.jpg');
    expect(s.hydrated).toBe(true);
  });

  it('set() directly populates fields', () => {
    useZhihuSessionStore.getState().set({
      uid: 7,
      fullname: '顾婉昔',
      avatarPath: null,
      exp: 123_456,
    });
    const s = useZhihuSessionStore.getState();
    expect(s.uid).toBe(7);
    expect(s.fullname).toBe('顾婉昔');
    expect(s.avatarPath).toBeNull();
    expect(s.exp).toBe(123_456);
    expect(s.hydrated).toBe(true);
  });

  it('clear() resets fields to null', () => {
    useZhihuSessionStore.getState().set({
      uid: 7,
      fullname: '顾婉昔',
      avatarPath: null,
      exp: 123_456,
    });
    useZhihuSessionStore.getState().clear();
    const s = useZhihuSessionStore.getState();
    expect(s.uid).toBeNull();
    expect(s.fullname).toBeNull();
    expect(s.avatarPath).toBeNull();
    expect(s.exp).toBeNull();
  });
});
