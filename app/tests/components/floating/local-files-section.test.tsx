import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, screen } from '@testing-library/react';
import { LocalFilesSection } from '@/components/floating/LocalFilesSection';
import { useEditorTabsStore } from '@/lib/store/editor-tabs';
import { useFolderHandleStore } from '@/lib/store/folder-handle';

function seed() {
  useEditorTabsStore.setState({
    docs: {
      a: {
        id: 'a',
        filename: 'a.md',
        htmlContent: '<p>aaa</p>',
        lastSavedAt: Date.now() - 1000,
        dirty: false,
        source: 'local',
      },
      b: {
        id: 'b',
        filename: 'b.md',
        htmlContent: '<p>bbb</p>',
        lastSavedAt: Date.now(),
        dirty: true,
        source: 'local',
      },
    },
    activeId: 'a',
    hydratedFor: 'me',
  });
  useFolderHandleStore.setState({
    handle: null,
    permission: null,
    folderName: null,
    fileHandles: {},
  });
}

beforeEach(() => {
  window.localStorage.clear();
  seed();
});
afterEach(() => cleanup());

describe('LocalFilesSection', () => {
  it('renders header with count + two file rows', () => {
    render(<LocalFilesSection />);
    expect(screen.getByTestId('vault-local-files-section')).toBeInTheDocument();
    expect(screen.getByTestId('vault-local-row-a')).toBeInTheDocument();
    expect(screen.getByTestId('vault-local-row-b')).toBeInTheDocument();
    expect(screen.getByText(/2 卷/)).toBeInTheDocument();
  });

  it('rows render in most-recent-first order', () => {
    render(<LocalFilesSection />);
    const rows = screen.getAllByText(/\.md$/i).map((n) => n.textContent);
    expect(rows[0]).toContain('b.md');
    expect(rows[1]).toContain('a.md');
  });

  it('+ 新建 creates an untitled doc', () => {
    render(<LocalFilesSection />);
    fireEvent.click(screen.getByTestId('vault-local-new'));
    const state = useEditorTabsStore.getState();
    expect(Object.values(state.docs).some((d) => d.filename === 'untitled-1.md')).toBe(true);
  });

  it('click 打开 switches active', () => {
    render(<LocalFilesSection />);
    fireEvent.click(screen.getByTestId('vault-local-open-b'));
    expect(useEditorTabsStore.getState().activeId).toBe('b');
  });

  it('click 重命名 enters input, Enter commits the new filename', () => {
    render(<LocalFilesSection />);
    fireEvent.click(screen.getByTestId('vault-local-rename-a'));
    const input = screen.getByTestId('vault-local-rename-input-a') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'renamed' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const state = useEditorTabsStore.getState();
    expect(state.docs.a.filename).toBe('renamed.md');
  });

  it('FSA-unsupported environment shows disabled folder pill', () => {
    // jsdom has no showDirectoryPicker — element renders with -unsupported testid
    render(<LocalFilesSection />);
    expect(screen.getByTestId('vault-folder-bind-unsupported')).toBeInTheDocument();
  });

  it('FSA-supported environment shows the bind button', () => {
    (window as unknown as Record<string, unknown>).showDirectoryPicker = vi.fn();
    render(<LocalFilesSection />);
    expect(screen.getByTestId('vault-folder-bind')).toBeInTheDocument();
    delete (window as unknown as Record<string, unknown>).showDirectoryPicker;
  });

  it('collapse toggle hides the list', () => {
    render(<LocalFilesSection />);
    fireEvent.click(screen.getByTestId('vault-local-toggle'));
    expect(screen.queryByTestId('vault-local-list')).toBeNull();
  });
});
