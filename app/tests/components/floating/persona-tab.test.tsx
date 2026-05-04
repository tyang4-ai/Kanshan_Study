import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from '@testing-library/react';
import { PersonaTab } from '@/components/floating/PersonaTab';

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
          encoder.encode(`event: ${ev.event}\ndata: ${JSON.stringify(ev.data)}\n\n`)
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

function maskName(round: 1 | 2 | 3, idx: number): SseEvent {
  const masks = ['路人读者', '业内行家', '社畜读者', '边界关注者'];
  return {
    event: 'message',
    data: {
      id: `m-${round}-${idx}`,
      round,
      foxId: 'wen',
      mask: masks[idx],
      text: `R${round} 读者${idx + 1} 的发言。`,
      tags: [`tag-${idx}`],
    },
  };
}

function roundsEvents(rounds: 1 | 2 | 3): SseEvent[] {
  const events: SseEvent[] = [];
  for (let r = 1 as 1 | 2 | 3; r <= rounds; r = (r + 1) as 1 | 2 | 3) {
    events.push({ event: 'round-start', data: { round: r } });
    for (let i = 0; i < 4; i++) events.push(maskName(r, i));
    events.push({ event: 'round-end', data: { round: r } });
  }
  events.push({ event: 'done', data: {} });
  return events;
}

interface FetchCall {
  url: string;
  body: Record<string, unknown>;
}

function setupFetch(
  responder: (call: FetchCall) => Response | Promise<Response>
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

describe('PersonaTab', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('mount → fetches /api/agents/persona-panel with rounds=1 + 4 fixed masks → renders 4 PersonaMessage cards + ComplianceLine + 看心 typing indicator', async () => {
    const { calls } = setupFetch(() => makeSseResponse(roundsEvents(1)));

    render(<PersonaTab />);

    await waitFor(() => {
      expect(screen.getAllByTestId('persona-message')).toHaveLength(4);
    });

    expect(calls[0].url).toBe('/api/agents/persona-panel');
    expect(calls[0].body.rounds).toBe(1);
    expect(calls[0].body.mode).toBe('rounds');
    const fixedIds = calls[0].body.fixedIds as string[];
    expect(fixedIds).toEqual(
      expect.arrayContaining(['passerby', 'expert', 'whitecollar', 'boundary'])
    );
    expect(fixedIds.length).toBe(4);

    expect(screen.getByTestId('compliance-line')).toHaveTextContent(
      '仿真读者 · 非真人 · 不可作为审稿依据'
    );
    expect(screen.getByTestId('persona-typing-indicator')).toBeInTheDocument();
    expect(screen.getByText('看心 正在审阅…')).toBeInTheDocument();
  });

  it('changing rounds=2 (with multi-mask) → re-fetches with rounds=2, RoundDivider for round 2 renders', async () => {
    const { calls } = setupFetch((call) => {
      const r = (call.body.rounds as 1 | 2 | 3) ?? 1;
      return makeSseResponse(roundsEvents(r));
    });

    render(<PersonaTab />);

    await waitFor(() => {
      expect(screen.getAllByTestId('persona-message')).toHaveLength(4);
    });

    // Find the RoundSelector buttons and click the "2" one
    const selector = screen.getByTestId('round-selector');
    const btn2 = within(selector).getByRole('button', { name: '2' });
    fireEvent.click(btn2);

    await waitFor(() => {
      // last call should have rounds=2
      const last = calls[calls.length - 1];
      expect(last.body.rounds).toBe(2);
    });

    await waitFor(() => {
      const dividers = screen.getAllByTestId('round-divider');
      expect(dividers.length).toBe(2);
      expect(dividers[1]).toHaveTextContent('第 2 轮 · 互评');
    });
  });

  it('single-mask scenario → RoundSelector disabled (assert by toBeDisabled())', async () => {
    setupFetch(() => makeSseResponse(roundsEvents(1)));

    render(<PersonaTab />);

    await waitFor(() => {
      expect(screen.getAllByTestId('persona-message')).toHaveLength(4);
    });

    // Deselect 3 of the 4 fixed masks → only 1 remaining
    const chipRow = screen.getByTestId('mask-chip-row');
    fireEvent.click(within(chipRow).getByRole('button', { name: '业内行家' }));
    fireEvent.click(within(chipRow).getByRole('button', { name: '社畜读者' }));
    fireEvent.click(within(chipRow).getByRole('button', { name: '边界关注者' }));

    const selector = screen.getByTestId('round-selector');
    const buttons = within(selector).getAllByRole('button');
    buttons.forEach((b) => expect(b).toBeDisabled());
  });

  it('followup submit → user bubble appears, followup POST fires with mode=followup, response message rendered', async () => {
    const { calls } = setupFetch((call) => {
      if (call.body.mode === 'followup') {
        return makeSseResponse([
          { event: 'routing', data: { chosenMaskLabel: '业内行家', why: 'best fit' } },
          {
            event: 'message',
            data: {
              id: 'fu-1',
              round: 1,
              foxId: 'wen',
              mask: '业内行家',
              text: '追问回应：这一处可改为「在临床决策场景下高度受限」。',
              tags: ['措辞替换'],
              replyToMask: '你',
            },
          },
          { event: 'done', data: {} },
        ]);
      }
      return makeSseResponse(roundsEvents(1));
    });

    render(<PersonaTab />);

    await waitFor(() => {
      expect(screen.getAllByTestId('persona-message')).toHaveLength(4);
    });

    const input = screen.getByTestId('persona-followup-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '能不能给出一个改写建议？' } });
    fireEvent.click(screen.getByTestId('persona-followup-send'));

    await waitFor(() => {
      expect(screen.getByTestId('user-bubble')).toBeInTheDocument();
    });
    expect(screen.getByTestId('user-bubble')).toHaveTextContent('能不能给出一个改写建议？');

    // followup POST happened with mode='followup'
    const followupCall = calls.find((c) => c.body.mode === 'followup');
    expect(followupCall).toBeTruthy();
    expect(followupCall!.body.userMessage).toBe('能不能给出一个改写建议？');
    expect(Array.isArray(followupCall!.body.history)).toBe(true);
    expect((followupCall!.body.history as unknown[]).length).toBe(4);

    // followup response message rendered
    await waitFor(() => {
      expect(
        screen.getByText('追问回应：这一处可改为「在临床决策场景下高度受限」。')
      ).toBeInTheDocument();
    });
  });

  it('error event → fallback messages render, mock badge text contains 余额 near ComplianceLine', async () => {
    setupFetch(() =>
      makeSseResponse([
        { event: 'round-start', data: { round: 1 } },
        {
          event: 'error',
          data: {
            message: 'DeepSeek 402 余额不足',
            fallback: [
              {
                id: 'fb-1',
                round: 1,
                foxId: 'wen',
                mask: '路人读者',
                text: 'fallback 路人发言',
                tags: ['mock'],
              },
              {
                id: 'fb-2',
                round: 1,
                foxId: 'wen',
                mask: '业内行家',
                text: 'fallback 行家发言',
                tags: ['mock'],
              },
            ],
          },
        },
        { event: 'done', data: {} },
      ])
    );

    render(<PersonaTab />);

    await waitFor(() => {
      expect(screen.getByText('fallback 路人发言')).toBeInTheDocument();
    });
    expect(screen.getByText('fallback 行家发言')).toBeInTheDocument();

    const compliance = screen.getByTestId('compliance-line');
    expect(compliance.textContent ?? '').toMatch(/余额|mock data/);
  });

  it('custom mask "+" flow: click + → CustomMaskForm appears → fill + submit → re-fetch includes custom in body', async () => {
    const { calls } = setupFetch(() => makeSseResponse(roundsEvents(1)));

    render(<PersonaTab />);

    await waitFor(() => {
      expect(screen.getAllByTestId('persona-message')).toHaveLength(4);
    });

    fireEvent.click(screen.getByRole('button', { name: '添加自定义面具' }));
    expect(screen.getByTestId('custom-mask-form')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('面具名'), {
      target: { value: '诊室助理' },
    });
    fireEvent.change(screen.getByLabelText('读者视角描述'), {
      target: { value: '一位刚入职的诊室助理，关心流程顺畅度。' },
    });
    fireEvent.click(screen.getByRole('button', { name: '提交' }));

    await waitFor(() => {
      const last = calls[calls.length - 1];
      const custom = last.body.custom as Array<{ label: string; description: string }>;
      expect(Array.isArray(custom)).toBe(true);
      expect(custom.some((m) => m.label === '诊室助理')).toBe(true);
    });
  });

  it('rapid double-click on rounds toggle → only the latest stream\'s messages persist (AbortController cancels prior fetch)', async () => {
    // Stream A (rounds=2): emits a "first round message" then waits for a manual release before continuing.
    // Stream B (rounds=3): emits a unique message immediately.
    let releaseA: () => void = () => {};
    const streamAReleased = new Promise<void>((resolve) => {
      releaseA = resolve;
    });

    const { calls } = setupFetch((call) => {
      const r = call.body.rounds as 1 | 2 | 3;
      if (r === 2) {
        // Stream A: a slow stream that emits 1 message then awaits release
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            controller.enqueue(
              encoder.encode(
                `event: round-start\ndata: ${JSON.stringify({ round: 1 })}\n\n`
              )
            );
            controller.enqueue(
              encoder.encode(
                `event: message\ndata: ${JSON.stringify({
                  id: 'A-1',
                  round: 1,
                  foxId: 'wen',
                  mask: 'A-stream-mask',
                  text: 'STREAM A message',
                  tags: [],
                })}\n\n`
              )
            );
            await streamAReleased;
            controller.enqueue(
              encoder.encode(
                `event: message\ndata: ${JSON.stringify({
                  id: 'A-2',
                  round: 1,
                  foxId: 'wen',
                  mask: 'A-late-mask',
                  text: 'STREAM A late message',
                  tags: [],
                })}\n\n`
              )
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
      // Stream B (rounds=3 or default): immediate
      return makeSseResponse([
        { event: 'round-start', data: { round: 1 } },
        {
          event: 'message',
          data: {
            id: 'B-1',
            round: 1,
            foxId: 'wen',
            mask: 'B-stream-mask',
            text: 'STREAM B message',
            tags: [],
          },
        },
        { event: 'done', data: {} },
      ]);
    });

    render(<PersonaTab />);

    // wait for the initial rounds=1 fetch to settle (don't care about the result)
    await waitFor(() => {
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    const selector = screen.getByTestId('round-selector');
    // rapid double-click: 2, then 3
    fireEvent.click(within(selector).getByRole('button', { name: '2' }));
    fireEvent.click(within(selector).getByRole('button', { name: '3' }));

    // wait until stream B has fired and produced its message
    await waitFor(() => {
      expect(screen.getByText('STREAM B message')).toBeInTheDocument();
    });

    // Now release stream A — its late message should NOT appear (AbortController cancels)
    releaseA();
    // give the event loop a chance to NOT process the late chunk
    await new Promise((r) => setTimeout(r, 50));

    expect(screen.queryByText('STREAM A late message')).not.toBeInTheDocument();
  });
});
