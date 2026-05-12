import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { VaultEntry, type VaultEntryData } from '@/components/floating/VaultEntry';
import { useAccountStore } from '@/lib/store/account';

const entry: VaultEntryData = {
  id: 'me-test-01',
  title: '测试条目',
  snippet: '这是测试片段',
  year: '2026',
  date: '2026-05-11',
  words: 200,
  borrows: 0,
  tags: ['测试'],
  spine: '#1772F6',
};

function noop(): void {
  /* test stub */
}

function renderEntry(): void {
  render(
    <VaultEntry
      entry={entry}
      onOpen={noop}
      onExportMd={noop}
      onExportDocx={noop}
      onDelete={noop}
    />
  );
}

describe('VaultEntry · 查看分块 toggle', () => {
  beforeEach(() => {
    useAccountStore.setState({ active: 'me' });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('panel is hidden until 查看分块 is clicked', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ articleId: entry.id, chunks: [] }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    renderEntry();
    expect(
      screen.queryByTestId(`vault-entry-chunks-panel-${entry.id}`)
    ).not.toBeInTheDocument();
    const toggle = screen.getByTestId(`vault-entry-chunks-toggle-${entry.id}`);
    expect(toggle).toHaveTextContent('查看分块');
  });

  it('opens panel and shows chunk previews after fetch resolves', async () => {
    const chunks = [
      { id: 'me-test-01-c0', text: '第一块内容，长度小于八十', charCount: 12, position: 0 },
      { id: 'me-test-01-c1', text: '第二块内容', charCount: 5, position: 1 },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ articleId: entry.id, chunks }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    renderEntry();
    await act(async () => {
      fireEvent.click(screen.getByTestId(`vault-entry-chunks-toggle-${entry.id}`));
    });
    expect(
      screen.getByTestId(`vault-entry-chunks-panel-${entry.id}`)
    ).toBeInTheDocument();
    expect(screen.getByText('共 2 块')).toBeInTheDocument();
    expect(
      screen.getByTestId('vault-entry-chunk-row-me-test-01-c0')
    ).toBeInTheDocument();
    expect(screen.getByText(/第一块内容/)).toBeInTheDocument();
    expect(
      screen.getByTestId(`vault-entry-chunks-toggle-${entry.id}`)
    ).toHaveTextContent('收起分块');
  });

  it('shows loading state while fetch is pending', async () => {
    let resolveFetch: ((v: unknown) => void) | undefined;
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
    renderEntry();
    fireEvent.click(screen.getByTestId(`vault-entry-chunks-toggle-${entry.id}`));
    expect(screen.getByText('读取分块中...')).toBeInTheDocument();
    await act(async () => {
      resolveFetch?.({
        ok: true,
        json: async () => ({ articleId: entry.id, chunks: [] }),
      });
    });
  });

  it('shows error state when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('boom')) as unknown as typeof fetch;
    renderEntry();
    await act(async () => {
      fireEvent.click(screen.getByTestId(`vault-entry-chunks-toggle-${entry.id}`));
    });
    expect(screen.getByText('无法读取分块')).toBeInTheDocument();
  });

  it('toggles closed without re-fetching', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ articleId: entry.id, chunks: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    renderEntry();
    await act(async () => {
      fireEvent.click(screen.getByTestId(`vault-entry-chunks-toggle-${entry.id}`));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId(`vault-entry-chunks-toggle-${entry.id}`));
    expect(
      screen.queryByTestId(`vault-entry-chunks-panel-${entry.id}`)
    ).not.toBeInTheDocument();
    // re-open should not refetch since data is cached
    await act(async () => {
      fireEvent.click(screen.getByTestId(`vault-entry-chunks-toggle-${entry.id}`));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
