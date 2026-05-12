import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { KanshanChatTab } from '@/components/floating/KanshanChatTab';
import { useFloatingWindowStore } from '@/lib/store/floating-window';
import { useCorkboardStore } from '@/lib/store/corkboard';

function makeSseResponse(events: { event: string; data: object }[]): Response {
  const body = events
    .map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`)
    .join('');
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('KanshanChatTab', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useFloatingWindowStore.setState({ open: false, tabs: [], activeTabId: null });
    useCorkboardStore.getState().clear();
    // L9-2: tests must start with a clean session log so sessionStorage state
    // from one test doesn't leak into the next.
    window.sessionStorage.clear();
  });

  it('renders empty placeholder when no turns', () => {
    const { container } = render(<KanshanChatTab />);
    expect(container.textContent).toContain('让看山想想');
  });

  // L9-2 (Lin Maohua R9, 2026-05-11): chat history persists across panel
  // close/reopen via sessionStorage (browser-tab-scoped, in-memory).
  describe('sessionStorage persistence', () => {
    it('hydrates from sessionStorage on mount', () => {
      const stored = [
        { role: 'user', content: '帮我看看影像组学', ts: 1234567890 },
        { role: 'kanshan', content: '好，让看水查一下', ts: 1234567891 },
      ];
      window.sessionStorage.setItem('kanshan-chat-session-v1', JSON.stringify(stored));
      const { container } = render(<KanshanChatTab />);
      expect(container.textContent).toContain('帮我看看影像组学');
      expect(container.textContent).toContain('好，让看水查一下');
    });

    it('drops malformed entries from sessionStorage rather than throwing', () => {
      window.sessionStorage.setItem(
        'kanshan-chat-session-v1',
        JSON.stringify([
          { role: 'user', content: 'valid', ts: 1 },
          { not: 'a turn' },
          null,
          { role: 'kanshan', ts: 2 }, // missing content
        ]),
      );
      const { container } = render(<KanshanChatTab />);
      // Only the valid one renders; render does NOT throw.
      expect(container.textContent).toContain('valid');
      expect(container.textContent).not.toContain('a turn');
    });

    it('ignores corrupt JSON in sessionStorage', () => {
      window.sessionStorage.setItem('kanshan-chat-session-v1', '{not valid json');
      const { container } = render(<KanshanChatTab />);
      // Falls back to empty placeholder.
      expect(container.textContent).toContain('让看山想想');
    });

    it('清空 button is hidden when no turns', () => {
      const { queryByTestId } = render(<KanshanChatTab />);
      expect(queryByTestId('kanshan-chat-clear')).toBeNull();
    });

    it('清空 button surfaces when turns present, and clears state + sessionStorage', () => {
      window.sessionStorage.setItem(
        'kanshan-chat-session-v1',
        JSON.stringify([{ role: 'user', content: 'test', ts: 1 }]),
      );
      const { getByTestId, container, queryByTestId } = render(<KanshanChatTab />);
      const clearBtn = getByTestId('kanshan-chat-clear');
      expect(clearBtn).toBeTruthy();
      fireEvent.click(clearBtn);
      // State cleared, button gone, sessionStorage cleared
      expect(container.textContent).toContain('让看山想想');
      expect(queryByTestId('kanshan-chat-clear')).toBeNull();
      expect(window.sessionStorage.getItem('kanshan-chat-session-v1')).toBeNull();
    });
  });

  it('Enter while IME composing does not send', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(makeSseResponse([]));
    vi.stubGlobal('fetch', fetchSpy);
    const { getByTestId } = render(<KanshanChatTab />);
    const input = getByTestId('kanshan-chat-input') as HTMLTextAreaElement;
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '中文测试' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(fetchSpy).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
  });

  it('rapid double-send is debounced (only one fetch fires)', async () => {
    const fetchSpy = vi.fn().mockReturnValue(
      new Promise<Response>((resolve) =>
        setTimeout(() => resolve(makeSseResponse([])), 50),
      ),
    );
    vi.stubGlobal('fetch', fetchSpy);
    const { getByTestId } = render(<KanshanChatTab />);
    const input = getByTestId('kanshan-chat-input') as HTMLTextAreaElement;
    const sendBtn = getByTestId('kanshan-chat-send');
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.click(sendBtn);
    fireEvent.click(sendBtn);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('SSE reply event renders as kanshan bubble', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeSseResponse([{ event: 'reply', data: { text: '看山在听。' } }]),
      ),
    );
    const { getByTestId, container } = render(<KanshanChatTab />);
    fireEvent.change(getByTestId('kanshan-chat-input'), { target: { value: 'hi' } });
    fireEvent.click(getByTestId('kanshan-chat-send'));
    await waitFor(() => {
      expect(container.textContent).toContain('看山在听。');
    });
  });

  it('tool_call open_research opens research tab', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeSseResponse([
          { event: 'reply', data: { text: '让看水查一下。' } },
          { event: 'tool_call', data: { tool: 'open_research', args: { query: '影像组学' } } },
        ]),
      ),
    );
    const { getByTestId } = render(<KanshanChatTab />);
    fireEvent.change(getByTestId('kanshan-chat-input'), { target: { value: '找点研究' } });
    fireEvent.click(getByTestId('kanshan-chat-send'));
    await waitFor(() => {
      const state = useFloatingWindowStore.getState();
      expect(state.tabs.some((t) => t.kind === 'research')).toBe(true);
    }, { timeout: 800 });
  });

  it('tool_call pin_to_corkboard adds a 看山-created pin', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        makeSseResponse([
          { event: 'reply', data: { text: '记一笔。' } },
          { event: 'tool_call', data: { tool: 'pin_to_corkboard', args: { title: '关键观察', snippet: 'X' } } },
        ]),
      ),
    );
    const { getByTestId } = render(<KanshanChatTab />);
    fireEvent.change(getByTestId('kanshan-chat-input'), { target: { value: '帮我记一下' } });
    fireEvent.click(getByTestId('kanshan-chat-send'));
    await waitFor(() => {
      const pins = useCorkboardStore.getState().pins;
      expect(pins.some((p) => p.createdBy === 'kanshan')).toBe(true);
    }, { timeout: 800 });
  });

  it('network failure shows fallback bubble', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { getByTestId, container } = render(<KanshanChatTab />);
    fireEvent.change(getByTestId('kanshan-chat-input'), { target: { value: 'hi' } });
    fireEvent.click(getByTestId('kanshan-chat-send'));
    await waitFor(() => {
      expect(container.textContent).toMatch(/网络中断|看山一时|未通/);
    });
  });
});
