import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { WritingSurface } from '@/components/editor/WritingSurface';
import { useEditorStore } from '@/lib/store/editor';
import { useEditorTabsStore } from '@/lib/store/editor-tabs';

function seedTabs() {
  useEditorTabsStore.setState({
    docs: {
      'tab-a': {
        id: 'tab-a',
        filename: '影像组学与基因组学.md',
        htmlContent: '<p>seed</p>',
        lastSavedAt: Date.now(),
        dirty: false,
        source: 'local',
      },
      'tab-b': {
        id: 'tab-b',
        filename: 'research-notes.md',
        htmlContent: '<p>research</p>',
        lastSavedAt: Date.now(),
        dirty: false,
        source: 'local',
      },
    },
    activeId: 'tab-a',
    hydratedFor: 'me',
  });
}

beforeEach(() => {
  useEditorStore.setState({ editor: null });
  seedTabs();
});
afterEach(() => cleanup());

describe('WritingSurface', () => {
  it('renders tabs from the store', () => {
    render(<WritingSurface />);
    expect(screen.getByText('影像组学与基因组学.md')).toBeInTheDocument();
    expect(screen.getByText('research-notes.md')).toBeInTheDocument();
  });

  it('marks the active-id tab as active', () => {
    render(<WritingSurface />);
    const firstFilename = screen.getByText('影像组学与基因组学.md');
    const tab = firstFilename.closest('[data-testid="tab"]');
    expect(tab).not.toBeNull();
    expect(tab!.getAttribute('data-active')).toBe('true');
  });

  it('clicking a different tab switches the active id', () => {
    render(<WritingSurface />);
    const other = screen.getByText('research-notes.md').closest('[data-testid="tab"]') as HTMLElement;
    fireEvent.click(other);
    expect(useEditorTabsStore.getState().activeId).toBe('tab-b');
  });

  it('+ 新建 creates a new untitled tab', () => {
    render(<WritingSurface />);
    fireEvent.click(screen.getByTestId('tab-new'));
    const state = useEditorTabsStore.getState();
    expect(Object.values(state.docs).some((d) => d.filename === 'untitled-1.md')).toBe(true);
  });

  it('mounts the TipTap editor inside the body region', async () => {
    render(<WritingSurface />);
    expect(screen.getByTestId('editor-body')).toBeInTheDocument();
    expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 30));
    expect(useEditorStore.getState().editor).not.toBeNull();
  });

  it('fires onContextMenu with click coords', () => {
    const onContextMenu = vi.fn();
    render(<WritingSurface onContextMenu={onContextMenu} />);
    const body = screen.getByTestId('editor-body');
    const outer = body.parentElement;
    expect(outer).not.toBeNull();
    fireEvent.contextMenu(outer!, { clientX: 200, clientY: 300 });
    expect(onContextMenu).toHaveBeenCalledTimes(1);
    const ev = onContextMenu.mock.calls[0][0] as { clientX: number; clientY: number };
    expect(ev.clientX).toBe(200);
    expect(ev.clientY).toBe(300);
  });
});
