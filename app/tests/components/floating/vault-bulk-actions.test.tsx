import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { VaultTab } from '@/components/floating/VaultTab';
import { useAccountStore, type AccountId } from '@/lib/store/account';
import guwanxiSeed from '@/content/seed/vault-guwanxi.json';

// Mock the download module so we can spy on triggerDownload.
vi.mock('@/lib/io/download', () => ({
  triggerDownload: vi.fn(),
  safeFilename: (base: string, ext: string) => `${base}.${ext}`,
}));

// Mock VaultEntry — Track 2 owns its rendering details. For Track 3 tests
// we only need a stable test-id surface to assert "entries cleared".
vi.mock('@/components/floating/VaultEntry', () => ({
  VaultEntry: ({ entry }: { entry: { id: string; title: string } }) => (
    <div data-testid={`vault-entry-${entry.id}`}>{entry.title}</div>
  ),
}));

// Mock LocalFilesSection so we don't drag the FSA / FS observer surface into
// this Track 3 test. It's an independent surface that has its own tests.
vi.mock('@/components/floating/LocalFilesSection', () => ({
  LocalFilesSection: () => <div data-testid="local-files-section-stub" />,
}));

import { triggerDownload } from '@/lib/io/download';

function setAccount(id: AccountId): void {
  useAccountStore.setState({ active: id });
}

interface FetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

function installFetch(handlers: {
  exportAll?: () => Promise<unknown>;
  deleteAll?: () => Promise<unknown>;
}): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockImplementation(async (url: RequestInfo, init?: FetchInit) => {
    const u = typeof url === 'string' ? url : (url as Request).url;
    if (u.includes('/api/vault/export-all')) {
      const body = handlers.exportAll
        ? await handlers.exportAll()
        : { exportedAt: 'x', account: 'guwanxi', totalArticles: 0, totalChunks: 0, articles: [] };
      return { ok: true, json: async () => body };
    }
    if (u.includes('/api/vault/all') && init?.method === 'DELETE') {
      const body = handlers.deleteAll
        ? await handlers.deleteAll()
        : { deleted: true, articleCount: 0, chunkCount: 0 };
      return { ok: true, json: async () => body };
    }
    if (u.includes('/api/vault/search')) {
      return { ok: true, json: async () => ({ hits: guwanxiSeed, source: 'seed' }) };
    }
    return { ok: true, json: async () => ({}) };
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.fetch = fn as any;
  return fn;
}

describe('VaultTab bulk actions', () => {
  beforeEach(() => {
    setAccount('guwanxi');
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(triggerDownload).mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the bulk-action toolbar with both buttons', () => {
    installFetch({});
    render(<VaultTab />);
    expect(screen.getByTestId('vault-bulk-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('vault-export-all')).toHaveTextContent('导出全部');
    expect(screen.getByTestId('vault-delete-all')).toHaveTextContent('删除全部');
  });

  it('导出全部 button → fetches export endpoint and calls triggerDownload with .json', async () => {
    const payload = {
      exportedAt: '2026-05-11T00:00:00.000Z',
      account: 'guwanxi',
      totalArticles: 1,
      totalChunks: 0,
      articles: [{ id: 'a', title: 't', content: 'c', tags: [], chunkCount: 0, createdAt: 'd' }],
    };
    const fetchFn = installFetch({ exportAll: async () => payload });
    render(<VaultTab />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('vault-export-all'));
      await new Promise((r) => setTimeout(r, 0));
    });

    // Endpoint called with correct headers
    const exportCall = fetchFn.mock.calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).includes('/api/vault/export-all'),
    );
    expect(exportCall).toBeDefined();
    expect((exportCall![1] as FetchInit).method).toBe('GET');
    expect((exportCall![1] as FetchInit).headers?.['x-kanshan-account']).toBe('guwanxi');

    // triggerDownload called with a Blob + .json filename
    expect(triggerDownload).toHaveBeenCalledTimes(1);
    const [blob, filename] = vi.mocked(triggerDownload).mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).type).toBe('application/json');
    expect(filename).toMatch(/\.json$/);
    expect(filename).toMatch(/vault-guwanxi-/);
  });

  it('删除全部 button → opens confirm modal', () => {
    installFetch({});
    render(<VaultTab />);
    expect(screen.queryByTestId('vault-delete-all-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('vault-delete-all'));
    expect(screen.getByTestId('vault-delete-all-modal')).toBeInTheDocument();
    expect(screen.getByText('永久删除所有档案？')).toBeInTheDocument();
  });

  it('confirm submit is disabled until input matches 删除全部 exactly', () => {
    installFetch({});
    render(<VaultTab />);
    fireEvent.click(screen.getByTestId('vault-delete-all'));

    const confirmBtn = screen.getByTestId('vault-delete-all-confirm') as HTMLButtonElement;
    const input = screen.getByTestId('vault-delete-all-input') as HTMLInputElement;

    // initially disabled
    expect(confirmBtn.disabled).toBe(true);

    // partial match: still disabled
    fireEvent.change(input, { target: { value: '删除' } });
    expect(confirmBtn.disabled).toBe(true);

    // whitespace padded: still disabled (no trimming)
    fireEvent.change(input, { target: { value: ' 删除全部' } });
    expect(confirmBtn.disabled).toBe(true);

    fireEvent.change(input, { target: { value: '删除全部 ' } });
    expect(confirmBtn.disabled).toBe(true);

    // exact match: enabled
    fireEvent.change(input, { target: { value: '删除全部' } });
    expect(confirmBtn.disabled).toBe(false);
  });

  it('submit + 200 response → article list cleared and modal closed', async () => {
    installFetch({
      deleteAll: async () => ({ deleted: true, articleCount: 7, chunkCount: 23 }),
    });
    render(<VaultTab />);

    // Sanity: seed entries are rendered.
    interface Seed { id: string }
    const seed = guwanxiSeed as Seed[];
    expect(screen.getByTestId(`vault-entry-${seed[0].id}`)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('vault-delete-all'));
    const input = screen.getByTestId('vault-delete-all-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '删除全部' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('vault-delete-all-confirm'));
      await new Promise((r) => setTimeout(r, 0));
    });

    // Modal closed.
    expect(screen.queryByTestId('vault-delete-all-modal')).not.toBeInTheDocument();

    // Article list optimistically cleared.
    expect(screen.queryByTestId(`vault-entry-${seed[0].id}`)).not.toBeInTheDocument();
    expect(screen.getByText('馆中无此书 · 请换一关键字')).toBeInTheDocument();
  });
});
