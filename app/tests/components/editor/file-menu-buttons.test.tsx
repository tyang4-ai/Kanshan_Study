import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { FileMenuButtons } from '@/components/editor/FileMenuButtons';
import { useEditorStore } from '@/lib/store/editor';
import { useEditorTabsStore } from '@/lib/store/editor-tabs';
import { useAiErrorStore } from '@/lib/store/ai-error';
import { DEFAULT_DOC_HTML } from '@/content/seed/default-document.html';

interface FakeEditor {
  getHTML: () => string;
  state: { doc: { textContent: string } };
  commands: { setContent: ReturnType<typeof vi.fn> };
  getJSON: () => unknown;
  storage: { markdown: { getMarkdown: () => string } };
}

function makeFakeEditor(html: string): FakeEditor {
  return {
    getHTML: () => html,
    state: { doc: { textContent: html.replace(/<[^>]+>/g, '').trim() } },
    commands: { setContent: vi.fn() },
    getJSON: () => ({ type: 'doc', content: [] }),
    storage: { markdown: { getMarkdown: () => '# md' } },
  };
}

describe('FileMenuButtons', () => {
  beforeEach(() => {
    useEditorTabsStore.setState({
      docs: {
        'tab-1': {
          id: 'tab-1',
          filename: '影像组学与基因组学.md',
          htmlContent: '<p>seed</p>',
          lastSavedAt: Date.now(),
          dirty: true,
          source: 'local',
        },
      },
      activeId: 'tab-1',
      hydratedFor: 'me',
    });
    useAiErrorStore.setState({ current: null });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders 导入 + 导出 buttons', () => {
    useEditorStore.setState({ editor: makeFakeEditor(DEFAULT_DOC_HTML) as never });
    const { getByTestId } = render(<FileMenuButtons />);
    expect(getByTestId('file-menu-import')).toBeTruthy();
    expect(getByTestId('file-menu-export')).toBeTruthy();
  });

  it('opens export dropdown and shows 5 formats', () => {
    useEditorStore.setState({ editor: makeFakeEditor(DEFAULT_DOC_HTML) as never });
    const { getByTestId } = render(<FileMenuButtons />);
    fireEvent.click(getByTestId('file-menu-export'));
    expect(getByTestId('file-menu-export-md')).toBeTruthy();
    expect(getByTestId('file-menu-export-txt')).toBeTruthy();
    expect(getByTestId('file-menu-export-html')).toBeTruthy();
    expect(getByTestId('file-menu-export-docx')).toBeTruthy();
    expect(getByTestId('file-menu-export-pdf')).toBeTruthy();
  });

  it('importing a .md replaces editor content when pristine (no dirty modal)', async () => {
    const fakeEditor = makeFakeEditor(DEFAULT_DOC_HTML);
    useEditorStore.setState({ editor: fakeEditor as never });
    const { getByTestId, queryByTestId } = render(<FileMenuButtons />);
    const input = getByTestId('file-menu-input') as HTMLInputElement;
    const file = new File(['# 新稿\n\n正文'], 'new.md', { type: 'text/markdown' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    await waitFor(() => {
      expect(fakeEditor.commands.setContent).toHaveBeenCalled();
    });
    expect(queryByTestId('file-menu-dirty-confirm')).toBeNull();
    // Tab filename updated
    const state = useEditorTabsStore.getState();
    const active = state.activeId ? state.docs[state.activeId] : null;
    expect(active?.filename).toBe('new.md');
  });

  it('importing while dirty shows confirm modal; cancel keeps content', async () => {
    const fakeEditor = makeFakeEditor('<p>用户已经写了不少内容了</p>'.repeat(20));
    useEditorStore.setState({ editor: fakeEditor as never });
    const { getByTestId, queryByTestId } = render(<FileMenuButtons />);
    const input = getByTestId('file-menu-input') as HTMLInputElement;
    const file = new File(['# X'], 'x.md', { type: 'text/markdown' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    // Modal opens; setContent NOT yet called
    expect(getByTestId('file-menu-dirty-confirm')).toBeTruthy();
    expect(fakeEditor.commands.setContent).not.toHaveBeenCalled();
    // Cancel
    fireEvent.click(getByTestId('file-menu-dirty-cancel'));
    expect(queryByTestId('file-menu-dirty-confirm')).toBeNull();
    expect(fakeEditor.commands.setContent).not.toHaveBeenCalled();
  });

  it('importing while dirty + confirm overwrites', async () => {
    const fakeEditor = makeFakeEditor('<p>用户已经写了不少内容了</p>'.repeat(20));
    useEditorStore.setState({ editor: fakeEditor as never });
    const { getByTestId } = render(<FileMenuButtons />);
    const input = getByTestId('file-menu-input') as HTMLInputElement;
    const file = new File(['# X'], 'x.md', { type: 'text/markdown' });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    fireEvent.click(getByTestId('file-menu-dirty-confirm-btn'));
    await waitFor(() => {
      expect(fakeEditor.commands.setContent).toHaveBeenCalled();
    });
  });

  it('export of unsupported format does nothing (defensive)', async () => {
    // sanity: there is no 6th export option, only 5
    useEditorStore.setState({ editor: makeFakeEditor(DEFAULT_DOC_HTML) as never });
    const { getByTestId, queryByTestId } = render(<FileMenuButtons />);
    fireEvent.click(getByTestId('file-menu-export'));
    expect(queryByTestId('file-menu-export-epub')).toBeNull();
    expect(getByTestId('file-menu-export-md')).toBeTruthy();
  });
});
