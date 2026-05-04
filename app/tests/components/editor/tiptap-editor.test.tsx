import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { useEditorStore } from '@/lib/store/editor';

const openTabMock = vi.fn();
vi.mock('@/lib/store/floating-window', () => ({
  useFloatingWindowStore: Object.assign(
    (selector: (s: { openTab: typeof openTabMock }) => unknown) =>
      selector({ openTab: openTabMock }),
    { getState: () => ({ openTab: openTabMock }) },
  ),
}));

beforeEach(() => {
  useEditorStore.setState({ editor: null });
  openTabMock.mockClear();
});
afterEach(() => cleanup());

describe('TipTapEditor', () => {
  it('mounts and registers editor in useEditorStore', async () => {
    render(<TipTapEditor content="<p>hello</p>" />);
    // useEditor mounts asynchronously; wait a tick.
    await new Promise((r) => setTimeout(r, 30));
    expect(useEditorStore.getState().editor).not.toBeNull();
  });

  it('initial doc with mark spans round-trips through InlineMark', async () => {
    const html = '<p><span data-mark-kind="ai-touched" data-mark-hint="x">marked</span> rest</p>';
    render(<TipTapEditor content={html} />);
    await new Promise((r) => setTimeout(r, 30));
    const out = useEditorStore.getState().editor?.getHTML() ?? '';
    expect(out).toContain('data-mark-kind="ai-touched"');
    expect(out).toContain('class="inline-mark-ai-touched"');
  });

  it('citation sup elements present in initial render', async () => {
    const html = '<p>cite: <sup data-citation-id="cite-w-3" data-kind="web" data-cite-label="[3]">[3]</sup></p>';
    const { container } = render(<TipTapEditor content={html} />);
    await new Promise((r) => setTimeout(r, 30));
    const sups = container.querySelectorAll('sup[data-citation-id]');
    expect(sups.length).toBeGreaterThan(0);
  });
});
