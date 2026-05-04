import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { VaultTab } from '@/components/floating/VaultTab';
import { useAccountStore, type AccountId } from '@/lib/store/account';
import guwanxiSeed from '@/content/seed/vault-guwanxi.json';

interface SeedEntry {
  id: string;
  title: string;
  snippet: string;
  year: string;
  date: string;
  words: number;
  borrows: number;
  tags: string[];
}

function setAccount(id: AccountId): void {
  useAccountStore.setState({ active: id });
}

function mockFetchHits(hits: unknown[], source: 'seed' | 'live' | 'seed-fallback' = 'seed'): void {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ hits, source }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

describe('VaultTab', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setAccount('guwanxi');
    // default fetch returns the full seed so debounce flushes don't blank the view
    mockFetchHits(guwanxiSeed as SeedEntry[]);
    // jsdom doesn't ship scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders 看典 · 档案库 title and ComplianceLine', () => {
    render(<VaultTab />);
    expect(screen.getByText('看典 · 档案库')).toBeInTheDocument();
    expect(screen.getByTestId('vault-compliance-line')).toHaveTextContent(
      '档案不入第三方训练集 · 仅你可见'
    );
  });

  it('renders 7 entries from seed grouped by year (year shelf headers visible)', () => {
    render(<VaultTab />);
    const seed = guwanxiSeed as SeedEntry[];
    expect(seed.length).toBe(7);
    seed.forEach((entry) => {
      expect(screen.getByTestId(`vault-entry-${entry.id}`)).toBeInTheDocument();
    });
    // Year shelf headers (sorted desc).
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
  });

  it('filter pill 医学 → only entries with 医学 tag remain', () => {
    render(<VaultTab />);
    fireEvent.click(screen.getByTestId('vault-filter-医学'));
    const medicalEntries = (guwanxiSeed as SeedEntry[]).filter((e) => e.tags.includes('医学'));
    medicalEntries.forEach((entry) => {
      expect(screen.getByTestId(`vault-entry-${entry.id}`)).toBeInTheDocument();
    });
    const nonMedical = (guwanxiSeed as SeedEntry[]).filter((e) => !e.tags.includes('医学'));
    nonMedical.forEach((entry) => {
      expect(screen.queryByTestId(`vault-entry-${entry.id}`)).not.toBeInTheDocument();
    });
  });

  it('search input change → fires POST to /api/vault/search after 200ms debounce', async () => {
    mockFetchHits([], 'seed');
    render(<VaultTab />);
    // initial debounce fires once (empty query). flush it.
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();

    fireEvent.change(screen.getByTestId('vault-search-input'), {
      target: { value: '不存在的关键词' },
    });
    // before debounce window
    expect(global.fetch).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/vault/search');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toMatchObject({ query: '不存在的关键词', topK: 7 });
    expect(init.headers['x-kanshan-account']).toBe('guwanxi');

    // empty-state assertion after server returned []
    expect(screen.getByText('馆中无此书 · 请换一关键字')).toBeInTheDocument();
  });

  it('IME composition guard: does not fire search while composing', async () => {
    render(<VaultTab />);
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();

    const input = screen.getByTestId('vault-search-input');
    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: '影' } });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    // no fetch fired during composition
    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.compositionEnd(input, { target: { value: '影像' } });
    fireEvent.change(input, { target: { value: '影像' } });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(global.fetch).toHaveBeenCalled();
  });

  it('rapid double-click on filter pills: last-wins', () => {
    render(<VaultTab />);
    fireEvent.click(screen.getByTestId('vault-filter-医学'));
    fireEvent.click(screen.getByTestId('vault-filter-随笔'));
    const essays = (guwanxiSeed as SeedEntry[]).filter((e) => e.tags.includes('随笔'));
    essays.forEach((e) => {
      expect(screen.getByTestId(`vault-entry-${e.id}`)).toBeInTheDocument();
    });
    const onlyMedical = (guwanxiSeed as SeedEntry[]).filter(
      (e) => e.tags.includes('医学') && !e.tags.includes('随笔')
    );
    onlyMedical.forEach((e) => {
      expect(screen.queryByTestId(`vault-entry-${e.id}`)).not.toBeInTheDocument();
    });
  });

  it('展卷 click → calls handler with the entry object (console.log spy)', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    render(<VaultTab />);
    const seed = guwanxiSeed as SeedEntry[];
    const first = seed[0];
    const button = screen.getByLabelText(`展卷 ${first.title}`);
    fireEvent.click(button);
    expect(spy).toHaveBeenCalledWith(
      'TODO plan #15: open in editor',
      expect.objectContaining({ id: first.id, title: first.title })
    );
    expect(screen.getByTestId('vault-open-message')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('empty corpus (me account) → renders empty state', async () => {
    setAccount('me');
    mockFetchHits([], 'seed');
    render(<VaultTab />);
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.getByText('馆中无此书 · 请换一关键字')).toBeInTheDocument();
  });

  it('scrollToArticleId matching an entry → scrollIntoView called once', () => {
    const seed = guwanxiSeed as SeedEntry[];
    const target = seed[0];
    render(<VaultTab scrollToArticleId={target.id} />);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('scrollToArticleId with unknown id → scrollIntoView not called', () => {
    render(<VaultTab scrollToArticleId="does-not-exist" />);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('without scrollToArticleId prop → scrollIntoView not called', () => {
    render(<VaultTab />);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('network error → graceful fallback (no crash, keeps current entries)', async () => {
    render(<VaultTab />);
    // initial entries from seed render
    const seed = guwanxiSeed as SeedEntry[];
    expect(screen.getByTestId(`vault-entry-${seed[0].id}`)).toBeInTheDocument();

    // now make fetch throw
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    fireEvent.change(screen.getByTestId('vault-search-input'), {
      target: { value: '影像' },
    });
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    // should not crash; entries from previous successful state remain
    expect(screen.getByTestId(`vault-entry-${seed[0].id}`)).toBeInTheDocument();
    errSpy.mockRestore();
  });
});
