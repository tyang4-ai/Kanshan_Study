import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';
import { DebateTab } from '@/components/floating/DebateTab';

interface SseEvent {
  event: string;
  data: unknown;
}

function makeSseStream(events: SseEvent[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      events.forEach((ev) => {
        controller.enqueue(
          encoder.encode(`event: ${ev.event}\ndata: ${JSON.stringify(ev.data)}\n\n`),
        );
      });
      controller.close();
    },
  });
}

function makeSseResponse(events: SseEvent[]): Response {
  return {
    ok: true,
    status: 200,
    body: makeSseStream(events),
  } as unknown as Response;
}

interface FetchCall {
  url: string;
  body: Record<string, unknown>;
}

function setupFetch(
  responder: (call: FetchCall) => Response | Promise<Response>,
): {
  fn: ReturnType<typeof vi.fn>;
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];
  const fn = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
    const body =
      typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};
    const call: FetchCall = { url, body };
    calls.push(call);
    return responder(call);
  });
  global.fetch = fn as unknown as typeof fetch;
  return { fn, calls };
}

function turnEvent(
  i: number,
  foxId: 'wen' | 'wen2',
  mask: string,
  text: string,
  replyToMask?: string,
): SseEvent {
  return {
    event: 'turn',
    data: {
      id: `t-${i}`,
      foxId,
      mask,
      position: foxId === 'wen' ? 'pro' : 'con',
      text,
      replyToMask,
      agree: replyToMask ? false : null,
    },
  };
}

function sixTurnEvents(): SseEvent[] {
  return [
    turnEvent(1, 'wen', '正方 · 力挺', '回合 1：保留这一句。'),
    turnEvent(2, 'wen2', '反方 · 质疑', '回合 2：反对，应删除。', '正方 · 力挺'),
    turnEvent(3, 'wen', '正方 · 力挺', '回合 3：再申辩。', '反方 · 质疑'),
    turnEvent(4, 'wen2', '反方 · 质疑', '回合 4：再反驳。', '正方 · 力挺'),
    turnEvent(5, 'wen', '正方 · 力挺', '回合 5：补充论据。', '反方 · 质疑'),
    turnEvent(6, 'wen2', '反方 · 质疑', '回合 6：终极反驳。', '正方 · 力挺'),
    { event: 'done', data: {} },
  ];
}

describe('DebateTab', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('mount → fetches /api/agents/debate with selection + turns=6, streams turns, eventually all 6 PersonaMessage rows', async () => {
    const { calls } = setupFetch(() => makeSseResponse(sixTurnEvents()));

    render(<DebateTab selection={{ text: '示例选段。' }} />);

    await waitFor(() => {
      expect(calls.length).toBe(1);
    });
    expect(calls[0].url).toBe('/api/agents/debate');
    expect(calls[0].body.selection).toBe('示例选段。');
    expect(calls[0].body.turns).toBe(6);

    // All 6 turns delivered → 5 already-completed PersonaMessage + 1 LiveDebateRow (latest)
    await waitFor(() => {
      expect(screen.getByTestId('live-debate-row')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getAllByTestId('persona-message').length).toBe(5);
    });

    // drive typewriter to completion for last turn (~36 chars, 30cps → ~1200ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    await waitFor(() => {
      expect(screen.queryByTestId('live-debate-row')).not.toBeInTheDocument();
    });
    expect(screen.getAllByTestId('persona-message').length).toBe(6);
  });

  it('reply pill on turn 2 reads 不同意 「正方 · 力挺」', async () => {
    setupFetch(() => makeSseResponse(sixTurnEvents()));

    render(<DebateTab selection={{ text: '示例选段。' }} />);

    await waitFor(() => {
      expect(screen.getAllByTestId('persona-message').length).toBeGreaterThanOrEqual(5);
    });

    // Drive typewriter to completion for the live row so all 6 are PersonaMessage
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    const pills = screen.getAllByTestId('persona-message-reply-pill');
    // turns 2..6 each have replyToMask → 5 reply pills
    expect(pills.length).toBeGreaterThanOrEqual(1);
    // First one (turn 2) replies to 正方 · 力挺
    expect(pills[0].textContent ?? '').toContain('不同意');
    expect(pills[0].textContent ?? '').toContain('正方 · 力挺');
  });

  it('error event with fallback turns → fallback banner [备用样例] renders above turns', async () => {
    setupFetch(() =>
      makeSseResponse([
        {
          event: 'error',
          data: {
            message: 'LLM 402 余额不足',
            fallback: [
              {
                id: 'fb-1',
                foxId: 'wen',
                mask: '正方 · 力挺',
                position: 'pro',
                text: 'fb 1',
              },
            ],
          },
        },
        { event: 'done', data: {} },
      ]),
    );

    render(<DebateTab selection={{ text: '示例选段。' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('debate-fallback-banner')).toBeInTheDocument();
    });
    expect(screen.getByTestId('debate-fallback-banner').textContent).toContain('备用样例');
  });

  it('error event → fallback turns rendered + ComplianceLine textContent matches /余额|mock data/', async () => {
    setupFetch(() =>
      makeSseResponse([
        {
          event: 'error',
          data: {
            message: 'DeepSeek 402 余额不足',
            fallback: [
              {
                id: 'fb-1',
                foxId: 'wen',
                mask: '正方 · 力挺',
                position: 'pro',
                text: 'fallback 正方发言',
              },
              {
                id: 'fb-2',
                foxId: 'wen2',
                mask: '反方 · 质疑',
                position: 'con',
                text: 'fallback 反方发言',
                replyToMask: '正方 · 力挺',
                agree: false,
              },
            ],
          },
        },
        { event: 'done', data: {} },
      ]),
    );

    render(<DebateTab selection={{ text: '示例选段。' }} />);

    await waitFor(() => {
      expect(screen.getByText('fallback 正方发言')).toBeInTheDocument();
    });
    expect(screen.getByText('fallback 反方发言')).toBeInTheDocument();

    const compliance = screen.getByTestId('compliance-line');
    expect(compliance.textContent ?? '').toMatch(/余额|mock data/);
  });

  it('ComplianceLine text contains 辩论由模型扮演 · 不代表真实立场', async () => {
    setupFetch(() => makeSseResponse([{ event: 'done', data: {} }]));

    render(<DebateTab selection={{ text: '示例选段。' }} />);

    await waitFor(() => {
      const compliance = screen.getByTestId('compliance-line');
      expect(compliance.textContent ?? '').toContain('辩论由模型扮演 · 不代表真实立场');
    });
  });

  it('rapid re-mount with new selection → first stream\'s late turns do not render after second stream\'s turns appear (AbortController cancels)', async () => {
    let releaseA: () => void = () => {};
    const streamAReleased = new Promise<void>((resolve) => {
      releaseA = resolve;
    });

    const { calls } = setupFetch((call) => {
      const sel = call.body.selection as string;
      if (sel === 'A') {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            controller.enqueue(
              encoder.encode(
                `event: turn\ndata: ${JSON.stringify({
                  id: 'A-1',
                  foxId: 'wen',
                  mask: '正方 · 力挺',
                  position: 'pro',
                  text: 'STREAM A turn 1',
                })}\n\n`,
              ),
            );
            await streamAReleased;
            controller.enqueue(
              encoder.encode(
                `event: turn\ndata: ${JSON.stringify({
                  id: 'A-LATE',
                  foxId: 'wen2',
                  mask: '反方 · 质疑',
                  position: 'con',
                  text: 'STREAM A late turn',
                  replyToMask: '正方 · 力挺',
                  agree: false,
                })}\n\n`,
              ),
            );
            controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
            controller.close();
          },
        });
        return {
          ok: true,
          status: 200,
          body: stream,
        } as unknown as Response;
      }
      // selection B → fast stream
      return makeSseResponse([
        {
          event: 'turn',
          data: {
            id: 'B-1',
            foxId: 'wen',
            mask: '正方 · 力挺',
            position: 'pro',
            text: 'STREAM B turn 1',
          },
        },
        { event: 'done', data: {} },
      ]);
    });

    const { rerender } = render(<DebateTab selection={{ text: 'A' }} />);

    await waitFor(() => {
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });
    // Wait for STREAM A's first turn to appear (in live row)
    await waitFor(() => {
      expect(screen.getByText('STREAM A turn 1')).toBeInTheDocument();
    });

    // Re-mount with new selection
    rerender(<DebateTab selection={{ text: 'B' }} />);

    await waitFor(() => {
      expect(screen.getByText('STREAM B turn 1')).toBeInTheDocument();
    });

    // Now release stream A — its late turn should NOT appear
    releaseA();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.queryByText('STREAM A late turn')).not.toBeInTheDocument();
  });
});
