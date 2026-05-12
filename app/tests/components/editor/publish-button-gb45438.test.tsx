import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { PublishButton } from '@/components/editor/PublishButton';
import { useEditorStore } from '@/lib/store/editor';
import { useAiErrorStore } from '@/lib/store/ai-error';

// Phase #15.8 Track 5 (2026-05-11): GB 45438 「AI 辅助生成」 标识 visibility.
// Per 周源 + emmett review, the publish dialog must surface a locked-checked
// AI-assisted disclosure, and the submitted body must carry aiAssisted +
// compliance fields so the server can append the canonical GB 45438 trailer.

interface FakeEditor {
  state: { doc: { textContent: string } };
}

function makeEditor(textContent: string): FakeEditor {
  return { state: { doc: { textContent } } };
}

const originalFetch = global.fetch;

beforeEach(() => {
  useEditorStore.setState({ editor: null });
  useAiErrorStore.setState({ current: null });
});

afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
});

describe('PublishButton — GB 45438 compliance row', () => {
  it('renders the GB 45438 row inside the open dialog', () => {
    render(<PublishButton />);
    fireEvent.click(screen.getByTestId('publish-to-zhihu-button'));
    const row = screen.getByTestId('publish-to-zhihu-gb45438-row');
    expect(row).toBeTruthy();
    expect(row.textContent).toContain('本文由看山书房 AI 辅助生成 · 发布时附 GB 45438 标识（不可关闭）');
  });

  it('checkbox is checked and disabled (cannot be toggled off)', () => {
    render(<PublishButton />);
    fireEvent.click(screen.getByTestId('publish-to-zhihu-button'));
    const cb = screen.getByTestId('publish-to-zhihu-gb45438-checkbox') as HTMLInputElement;
    expect(cb.checked).toBe(true);
    expect(cb.disabled).toBe(true);
    // Attempting to click it must not flip the state.
    fireEvent.click(cb);
    expect(cb.checked).toBe(true);
  });

  it('submit POST body includes aiAssisted:true + compliance:"GB-45438"', async () => {
    useEditorStore.setState({ editor: makeEditor('影像组学正在悄然转向') as never });
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ ok: true, result: {}, ringId: '2029619126742656657' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    global.fetch = fetchMock as never;
    render(<PublishButton />);
    fireEvent.click(screen.getByTestId('publish-to-zhihu-button'));
    fireEvent.click(screen.getByTestId('publish-to-zhihu-confirm'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const args = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
    const sent = JSON.parse(args[1].body) as {
      content: string;
      ringId: string;
      aiAssisted: boolean;
      compliance: string;
    };
    expect(sent.aiAssisted).toBe(true);
    expect(sent.compliance).toBe('GB-45438');
  });

  it('client-side submitted content does NOT carry the trailer (server-side responsibility)', async () => {
    useEditorStore.setState({ editor: makeEditor('影像组学正在悄然转向') as never });
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ ok: true, result: {}, ringId: '2029619126742656657' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    global.fetch = fetchMock as never;
    render(<PublishButton />);
    fireEvent.click(screen.getByTestId('publish-to-zhihu-button'));
    fireEvent.click(screen.getByTestId('publish-to-zhihu-confirm'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const args = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
    const sent = JSON.parse(args[1].body) as { content: string };
    expect(sent.content).not.toContain('GB 45438');
    expect(sent.content).toContain('影像组学正在悄然转向');
  });
});
