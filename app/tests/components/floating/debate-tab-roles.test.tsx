import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, act, fireEvent } from '@testing-library/react';
import { DebateTab } from '@/components/floating/DebateTab';
import { usePersonaMasksStore } from '@/lib/store/persona-masks';
import { useDebateConfigStore } from '@/lib/store/debate-config';
import type { CustomMask } from '@/lib/personas';

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
): { fn: ReturnType<typeof vi.fn>; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fn = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
    const body =
      typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};
    calls.push({ url, body });
    return responder({ url, body });
  });
  global.fetch = fn as unknown as typeof fetch;
  return { fn, calls };
}

const doneOnly = (): SseEvent[] => [{ event: 'done', data: {} }];

beforeEach(() => {
  window.localStorage.clear();
  usePersonaMasksStore.setState({ customMasks: [], hydratedFor: null });
  useDebateConfigStore.setState({
    proRoleId: 'expert',
    conRoleId: 'boundary',
    hydratedFor: null,
  });
  vi.useFakeTimers({ shouldAdvanceTime: true });
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('DebateTab role pickers', () => {
  it('renders pro + con selects with default values from store', async () => {
    setupFetch(() => makeSseResponse(doneOnly()));
    render(<DebateTab selection={{ text: '示例选段。' }} />);

    const pro = (await screen.findByTestId('debate-pro-select')) as HTMLSelectElement;
    const con = (await screen.findByTestId('debate-con-select')) as HTMLSelectElement;
    expect(pro.value).toBe('expert');
    expect(con.value).toBe('boundary');
  });

  it('custom mask added to persona-masks store shows up in BOTH pickers', async () => {
    setupFetch(() => makeSseResponse(doneOnly()));
    render(<DebateTab selection={{ text: '示例选段。' }} />);

    const custom: CustomMask = {
      id: 'cm-test-1',
      label: '诊室助理',
      description: 'desc',
      fox: 'wen2',
    };
    act(() => {
      usePersonaMasksStore.getState().addCustom(custom);
    });

    const pro = (await screen.findByTestId('debate-pro-select')) as HTMLSelectElement;
    const con = (await screen.findByTestId('debate-con-select')) as HTMLSelectElement;

    const proHas = Array.from(pro.options).some((o) => o.value === 'cm-test-1');
    const conHas = Array.from(con.options).some((o) => o.value === 'cm-test-1');
    expect(proHas).toBe(true);
    expect(conHas).toBe(true);
  });

  it('swap button flips 正/反 role ids', async () => {
    setupFetch(() => makeSseResponse(doneOnly()));
    render(<DebateTab selection={{ text: '示例选段。' }} />);

    const swap = await screen.findByTestId('debate-swap-button');
    await act(async () => {
      fireEvent.click(swap);
    });

    const pro = screen.getByTestId('debate-pro-select') as HTMLSelectElement;
    const con = screen.getByTestId('debate-con-select') as HTMLSelectElement;
    expect(pro.value).toBe('boundary');
    expect(con.value).toBe('expert');
  });

  it('selection persists across remount', async () => {
    setupFetch(() => makeSseResponse(doneOnly()));
    const { unmount } = render(<DebateTab selection={{ text: '示例选段。' }} />);

    const pro = (await screen.findByTestId('debate-pro-select')) as HTMLSelectElement;
    await act(async () => {
      fireEvent.change(pro, { target: { value: 'passerby' } });
    });
    expect(useDebateConfigStore.getState().proRoleId).toBe('passerby');

    unmount();

    // simulate fresh mount with a fresh state but populated LS
    useDebateConfigStore.setState({
      proRoleId: 'expert',
      conRoleId: 'boundary',
      hydratedFor: null,
    });
    render(<DebateTab selection={{ text: '示例选段。' }} />);
    const pro2 = (await screen.findByTestId('debate-pro-select')) as HTMLSelectElement;
    await waitFor(() => {
      expect(pro2.value).toBe('passerby');
    });
  });

  it('debate kickoff fetch includes proRole + conRole in body', async () => {
    const { calls } = setupFetch(() => makeSseResponse(doneOnly()));
    render(<DebateTab selection={{ text: '示例选段。' }} />);

    await waitFor(() => {
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });
    const body = calls[0].body as {
      proRole?: { id: string; label: string };
      conRole?: { id: string; label: string };
    };
    expect(body.proRole?.id).toBe('expert');
    expect(body.conRole?.id).toBe('boundary');
    expect(body.proRole?.label).toBe('业内行家');
    expect(body.conRole?.label).toBe('边界关注者');
  });
});
