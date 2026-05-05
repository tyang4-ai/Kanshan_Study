import { describe, it, expect, vi } from 'vitest';
import { replayStream, REPLAY_GAPS } from '@/lib/cache/replay';

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let out = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    out += dec.decode(value);
  }
  return out;
}

describe('replayStream', () => {
  it('emits each step in order with default gap, then a final event', async () => {
    vi.useFakeTimers();
    const steps = [
      { event: 'iter', data: { i: 0 } },
      { event: 'iter', data: { i: 1 } },
      { event: 'iter', data: { i: 2 } },
    ];
    const stream = replayStream(steps, {
      defaultGapMs: 10,
      finalEvent: 'done',
      finalData: { ok: true },
    });
    const promise = readAll(stream);
    await vi.runAllTimersAsync();
    const text = await promise;
    expect(text).toContain('event: iter');
    expect(text).toContain('"i":0');
    expect(text).toContain('"i":1');
    expect(text).toContain('"i":2');
    expect(text).toContain('event: done');
    vi.useRealTimers();
  });

  it('voice-fill replay uses 800ms gap', () => {
    expect(REPLAY_GAPS.voiceFillIter).toBe(800);
  });

  it('debate replay uses 1200ms gap', () => {
    expect(REPLAY_GAPS.debateTurn).toBe(1200);
  });

  it('per-step gap override', async () => {
    vi.useFakeTimers();
    const steps = [
      { event: 'a', data: 1, gapMs: 5 },
      { event: 'b', data: 2 },
    ];
    const stream = replayStream(steps, { defaultGapMs: 9999 });
    const promise = readAll(stream);
    await vi.advanceTimersByTimeAsync(5);
    const text = await promise;
    expect(text).toContain('event: a');
    expect(text).toContain('event: b');
    vi.useRealTimers();
  });
});
