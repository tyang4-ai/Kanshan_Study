import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { WritingSurface } from '@/components/editor/WritingSurface';
import { useEditorStore } from '@/lib/store/editor';

beforeEach(() => {
  useEditorStore.setState({ editor: null });
});
afterEach(() => cleanup());

describe('WritingSurface', () => {
  it('renders all 3 hardcoded tab filenames', () => {
    render(<WritingSurface />);
    expect(screen.getByText('影像组学与基因组学.md')).toBeInTheDocument();
    expect(screen.getByText('research-notes.md')).toBeInTheDocument();
    expect(screen.getByText('readme.md')).toBeInTheDocument();
  });

  it('marks the first tab as active', () => {
    render(<WritingSurface />);
    const firstFilename = screen.getByText('影像组学与基因组学.md');
    const tab = firstFilename.closest('[data-testid="tab"]');
    expect(tab).not.toBeNull();
    expect(tab!.getAttribute('data-active')).toBe('true');
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
