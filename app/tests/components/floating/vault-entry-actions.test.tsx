import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { VaultEntry, type VaultEntryData } from '@/components/floating/VaultEntry';
import { VaultTab } from '@/components/floating/VaultTab';
import { useAccountStore } from '@/lib/store/account';
import { useEditorTabsStore } from '@/lib/store/editor-tabs';
import guwanxiSeed from '@/content/seed/vault-guwanxi.json';

const ENTRY: VaultEntryData = {
  id: 'guwanxi-test-article',
  title: '测试档案',
  snippet: '# 标题\n\n这是测试正文。',
  year: '2025',
  date: '2025-05-11',
  words: 100,
  borrows: 0,
  tags: ['医学'],
  spine: '#1772F6',
};

beforeEach(() => {
  // mock URL.createObjectURL — jsdom doesn't have it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (URL as any).createObjectURL = vi.fn(() => 'blob:mock');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (URL as any).revokeObjectURL = vi.fn();
  // mock anchor.click so jsdom's navigation guard doesn't fail
  HTMLAnchorElement.prototype.click = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  useEditorTabsStore.setState({ docs: {}, activeId: null, hydratedFor: null });
  useAccountStore.setState({ active: 'guwanxi' });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('VaultEntry action chips', () => {
  function renderEntry(overrides: Partial<Parameters<typeof VaultEntry>[0]> = {}) {
    const props = {
      entry: ENTRY,
      onOpen: vi.fn(),
      onExportMd: vi.fn(),
      onExportDocx: vi.fn(),
      onDelete: vi.fn(),
      ...overrides,
    };
    render(<VaultEntry {...props} />);
    return props;
  }

  it('renders all 4 action chips for the entry', () => {
    renderEntry();
    expect(screen.getByTestId(`vault-entry-open-${ENTRY.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`vault-entry-export-md-${ENTRY.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`vault-entry-export-docx-${ENTRY.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`vault-entry-delete-${ENTRY.id}`)).toBeInTheDocument();
  });

  it('打开 chip → invokes onOpen with the entry', () => {
    const props = renderEntry();
    fireEvent.click(screen.getByTestId(`vault-entry-open-${ENTRY.id}`));
    expect(props.onOpen).toHaveBeenCalledTimes(1);
    expect(props.onOpen).toHaveBeenCalledWith(ENTRY);
  });

  it('导出 .md chip → invokes onExportMd with the entry', () => {
    const props = renderEntry();
    fireEvent.click(screen.getByTestId(`vault-entry-export-md-${ENTRY.id}`));
    expect(props.onExportMd).toHaveBeenCalledWith(ENTRY);
  });

  it('导出 .docx chip → invokes onExportDocx with the entry', () => {
    const props = renderEntry();
    fireEvent.click(screen.getByTestId(`vault-entry-export-docx-${ENTRY.id}`));
    expect(props.onExportDocx).toHaveBeenCalledWith(ENTRY);
  });

  it('删除 chip → invokes onDelete with the entry', () => {
    const props = renderEntry();
    fireEvent.click(screen.getByTestId(`vault-entry-delete-${ENTRY.id}`));
    expect(props.onDelete).toHaveBeenCalledWith(ENTRY);
  });
});

describe('VaultTab entry-actions integration', () => {
  beforeEach(() => {
    // VaultTab debounces a search on mount; mock fetch so it doesn't crash.
    global.fetch = vi.fn().mockImplementation(((url: RequestInfo) => {
      const u = typeof url === 'string' ? url : (url as Request).url;
      if (u.includes('/api/vault/search')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ hits: guwanxiSeed, source: 'seed' }),
        });
      }
      if (u.includes('/api/vault/articles/')) {
        return Promise.resolve({ ok: true, json: async () => ({ deleted: true }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
  });

  it('打开 on a vault entry → adds a tab with source=vault and vaultArticleId', async () => {
    useEditorTabsStore.getState().hydrate('guwanxi');
    const before = Object.keys(useEditorTabsStore.getState().docs);
    render(<VaultTab />);
    const seed = guwanxiSeed as VaultEntryData[];
    const first = seed[0];
    fireEvent.click(screen.getByTestId(`vault-entry-open-${first.id}`));
    const after = Object.values(useEditorTabsStore.getState().docs);
    const created = after.find((d) => !before.includes(d.id));
    expect(created).toBeDefined();
    expect(created?.source).toBe('vault');
    expect(created?.vaultArticleId).toBe(first.id);
  });

  it('打开 twice on the same entry → switches existing tab, no duplicate', async () => {
    useEditorTabsStore.getState().hydrate('guwanxi');
    render(<VaultTab />);
    const seed = guwanxiSeed as VaultEntryData[];
    const first = seed[0];
    fireEvent.click(screen.getByTestId(`vault-entry-open-${first.id}`));
    const countAfterFirst = Object.values(useEditorTabsStore.getState().docs).filter(
      (d) => d.source === 'vault',
    ).length;
    fireEvent.click(screen.getByTestId(`vault-entry-open-${first.id}`));
    const countAfterSecond = Object.values(useEditorTabsStore.getState().docs).filter(
      (d) => d.source === 'vault',
    ).length;
    expect(countAfterSecond).toBe(countAfterFirst);
    // active tab is the existing vault tab
    const state = useEditorTabsStore.getState();
    const activeDoc = state.activeId ? state.docs[state.activeId] : null;
    expect(activeDoc?.vaultArticleId).toBe(first.id);
  });

  it('导出 .md → calls triggerDownload via anchor.click', () => {
    render(<VaultTab />);
    const seed = guwanxiSeed as VaultEntryData[];
    const first = seed[0];
    fireEvent.click(screen.getByTestId(`vault-entry-export-md-${first.id}`));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it('导出 .docx → calls triggerDownload via anchor.click', async () => {
    render(<VaultTab />);
    const seed = guwanxiSeed as VaultEntryData[];
    const first = seed[0];
    await act(async () => {
      fireEvent.click(screen.getByTestId(`vault-entry-export-docx-${first.id}`));
      // exportDocxFromText is async (dynamic import of docx lib); flush
      // generously — under full-suite load the import resolution can slip
      // past 50ms.
      await new Promise((r) => setTimeout(r, 250));
    });
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it('删除 → opens confirm modal; cancel closes it without hitting API', () => {
    render(<VaultTab />);
    const seed = guwanxiSeed as VaultEntryData[];
    const first = seed[0];
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
    fireEvent.click(screen.getByTestId(`vault-entry-delete-${first.id}`));
    expect(screen.getByTestId('vault-delete-entry-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('vault-delete-entry-cancel'));
    expect(screen.queryByTestId('vault-delete-entry-modal')).not.toBeInTheDocument();
    // No DELETE call.
    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const deleteCalls = fetchCalls.filter(
      (c) => (c[1] as { method?: string } | undefined)?.method === 'DELETE',
    );
    expect(deleteCalls).toHaveLength(0);
  });

  it('删除 → confirm → DELETE /api/vault/articles/:id and entry removed from list', async () => {
    render(<VaultTab />);
    const seed = guwanxiSeed as VaultEntryData[];
    const first = seed[0];
    // Let the debounced search resolve first so its setSearchResults can't
    // race against our optimistic delete-filter below.
    await waitFor(() => {
      expect(screen.getByTestId(`vault-entry-${first.id}`)).toBeInTheDocument();
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 250));
    });
    // Override the search mock to return the post-delete shape so any
    // re-fetch on cleanup won't repopulate.
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(((url: RequestInfo) => {
      const u = typeof url === 'string' ? url : (url as Request).url;
      if (u.includes('/api/vault/search')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ hits: seed.filter((e) => e.id !== first.id), source: 'seed' }),
        });
      }
      if (u.includes('/api/vault/articles/')) {
        return Promise.resolve({ ok: true, json: async () => ({ deleted: true }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as unknown as typeof fetch);
    fireEvent.click(screen.getByTestId(`vault-entry-delete-${first.id}`));
    await act(async () => {
      fireEvent.click(screen.getByTestId('vault-delete-entry-confirm'));
      await new Promise((r) => setTimeout(r, 250));
    });
    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const deleteCall = fetchCalls.find(
      (c) => (c[1] as { method?: string } | undefined)?.method === 'DELETE',
    );
    expect(deleteCall).toBeDefined();
    expect(String(deleteCall![0])).toContain(`/api/vault/articles/${encodeURIComponent(first.id)}`);
    await waitFor(() => {
      expect(screen.queryByTestId(`vault-entry-${first.id}`)).not.toBeInTheDocument();
    });
  });

  it('删除 → if entry is open in editor, that tab is closed too', async () => {
    useEditorTabsStore.getState().hydrate('guwanxi');
    render(<VaultTab />);
    const seed = guwanxiSeed as VaultEntryData[];
    const first = seed[0];
    // Open it first
    fireEvent.click(screen.getByTestId(`vault-entry-open-${first.id}`));
    const openTab = Object.values(useEditorTabsStore.getState().docs).find(
      (d) => d.source === 'vault' && d.vaultArticleId === first.id,
    );
    expect(openTab).toBeDefined();
    // The floating-window closed on open; re-render path: just trigger delete via the action chip
    // (entry is still in the list since the floating window is just hidden).
    cleanup();
    render(<VaultTab />);
    fireEvent.click(screen.getByTestId(`vault-entry-delete-${first.id}`));
    await act(async () => {
      fireEvent.click(screen.getByTestId('vault-delete-entry-confirm'));
      await new Promise((r) => setTimeout(r, 50));
    });
    const stillThere = Object.values(useEditorTabsStore.getState().docs).find(
      (d) => d.source === 'vault' && d.vaultArticleId === first.id,
    );
    expect(stillThere).toBeUndefined();
  });
});
