import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { PublishButton } from '@/components/editor/PublishButton';
import { useEditorStore } from '@/lib/store/editor';
import { useAiErrorStore } from '@/lib/store/ai-error';

// S7-B2 (2026-05-11): PublishButton wraps the publishPin write surface. The
// button itself + modal toggling is the safest unit-level coverage; the
// actual POST behaviour is covered by the publish-pin route test. Here we
// pin: (a) button toggles modal, (b) preview reads from editor store,
// (c) hashtag add/remove works, (d) submit POSTs to /api/zhihu/publish-pin
// with the right shape, (e) success/error toast surfaces.

interface FakeEditor {
  state: { doc: { textContent: string } };
}

function makeEditor(textContent: string): FakeEditor {
  return { state: { doc: { textContent } } };
}

const originalFetch = global.fetch;

beforeEach(() => {
  // Reset stores
  useEditorStore.setState({ editor: null });
  useAiErrorStore.setState({ current: null });
});

afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
});

describe('PublishButton', () => {
  it('renders the trigger button with accessible label', () => {
    render(<PublishButton />);
    const btn = screen.getByTestId('publish-to-zhihu-button');
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-label')).toContain('发布到知乎');
  });

  it('modal closed by default; click opens it', () => {
    render(<PublishButton />);
    expect(screen.queryByTestId('publish-to-zhihu-modal')).toBeNull();
    fireEvent.click(screen.getByTestId('publish-to-zhihu-button'));
    expect(screen.getByTestId('publish-to-zhihu-modal')).toBeTruthy();
  });

  it('preview shows first 200 chars of editor content', () => {
    const longText = '影像组学正在悄然转向'.repeat(40); // > 200 chars
    useEditorStore.setState({ editor: makeEditor(longText) as never });
    render(<PublishButton />);
    fireEvent.click(screen.getByTestId('publish-to-zhihu-button'));
    const modal = screen.getByTestId('publish-to-zhihu-modal');
    // The preview is the first 200 chars; visible chunks should appear.
    expect(modal.textContent).toContain('影像组学正在悄然转向');
  });

  it('empty editor → preview shows fallback placeholder', () => {
    useEditorStore.setState({ editor: makeEditor('') as never });
    render(<PublishButton />);
    fireEvent.click(screen.getByTestId('publish-to-zhihu-button'));
    expect(screen.getByText('（编辑器为空）')).toBeTruthy();
  });

  it('four fixed hashtags present on first open', () => {
    render(<PublishButton />);
    fireEvent.click(screen.getByTestId('publish-to-zhihu-button'));
    const modal = screen.getByTestId('publish-to-zhihu-modal');
    expect(modal.textContent).toContain('#知乎黑客松');
    expect(modal.textContent).toContain('#看山书房');
    expect(modal.textContent).toContain('#答主工作台');
    expect(modal.textContent).toContain('#灵感激发');
  });

  it('custom tag input + Enter adds the tag with leading-# stripped', () => {
    render(<PublishButton />);
    fireEvent.click(screen.getByTestId('publish-to-zhihu-button'));
    const input = screen.getByLabelText('加自定义话题') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '#影像组学' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('publish-to-zhihu-modal').textContent).toContain('#影像组学');
    // input cleared
    expect(input.value).toBe('');
  });

  it('duplicate tag is a no-op (does not add twice)', () => {
    render(<PublishButton />);
    fireEvent.click(screen.getByTestId('publish-to-zhihu-button'));
    const input = screen.getByLabelText('加自定义话题') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '知乎黑客松' } }); // already in fixed list
    fireEvent.keyDown(input, { key: 'Enter' });
    // count occurrences in modal text
    const modal = screen.getByTestId('publish-to-zhihu-modal').textContent ?? '';
    const matches = modal.match(/#知乎黑客松/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('submit POSTs to /api/zhihu/publish-pin with content + hashtags + ringId', async () => {
    useEditorStore.setState({ editor: makeEditor('影像组学正在悄然转向') as never });
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, result: {}, ringId: '2029619126742656657' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    global.fetch = fetchMock as never;
    render(<PublishButton />);
    fireEvent.click(screen.getByTestId('publish-to-zhihu-button'));
    fireEvent.click(screen.getByTestId('publish-to-zhihu-confirm'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const args = fetchMock.mock.calls[0] as unknown as [string, { method: string; body: string }];
    expect(args[0]).toBe('/api/zhihu/publish-pin');
    expect(args[1].method).toBe('POST');
    const sent = JSON.parse(args[1].body) as { content: string; ringId: string };
    expect(sent.content).toContain('影像组学正在悄然转向');
    // hashtags concatenated to body
    expect(sent.content).toContain('#知乎黑客松');
    expect(sent.content).toContain('#看山书房');
    expect(sent.ringId).toBe('2029619126742656657');
  });

  it('success path → modal closes + status banner appears', async () => {
    useEditorStore.setState({ editor: makeEditor('hello') as never });
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true, result: {}, ringId: '2029619126742656657' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as never;
    render(<PublishButton />);
    fireEvent.click(screen.getByTestId('publish-to-zhihu-button'));
    fireEvent.click(screen.getByTestId('publish-to-zhihu-confirm'));
    await waitFor(() =>
      expect(screen.queryByTestId('publish-to-zhihu-modal')).toBeNull(),
    );
    expect(screen.getByTestId('publish-to-zhihu-success').textContent).toContain('黑客松脑洞补给站');
  });

  it('error path → AiErrorStore receives the scrubbed error', async () => {
    useEditorStore.setState({ editor: makeEditor('hello') as never });
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, error: 'upstream rejected' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as never;
    render(<PublishButton />);
    fireEvent.click(screen.getByTestId('publish-to-zhihu-button'));
    fireEvent.click(screen.getByTestId('publish-to-zhihu-confirm'));
    await waitFor(() => {
      const current = useAiErrorStore.getState().current;
      expect(current?.message).toBe('upstream rejected');
    });
  });

  it('empty editor → submit pushes an error toast instead of POSTing', async () => {
    useEditorStore.setState({ editor: makeEditor('') as never });
    const fetchMock = vi.fn();
    global.fetch = fetchMock as never;
    render(<PublishButton />);
    fireEvent.click(screen.getByTestId('publish-to-zhihu-button'));
    fireEvent.click(screen.getByTestId('publish-to-zhihu-confirm'));
    await waitFor(() => {
      const current = useAiErrorStore.getState().current;
      expect(current?.message).toContain('编辑器为空');
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
