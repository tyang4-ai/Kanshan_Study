import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({ getDb: vi.fn() }));
vi.mock('@/lib/embeddings', () => ({ embed: vi.fn() }));
vi.mock('@/lib/rerank', () => ({ rerank: vi.fn() }));

import { searchVault } from '@/lib/vault/search';
import { getDb } from '@/lib/db/client';
import { embed } from '@/lib/embeddings';
import { rerank } from '@/lib/rerank';

interface MockChunkRow {
  chunk_id: string;
  article_id: string;
  title: string;
  date: string | null;
  spine_color: string | null;
  borrows: number;
  tags: string[];
  content: string;
  cos_sim: number;
}

function makeRow(overrides: Partial<MockChunkRow> = {}): MockChunkRow {
  return {
    chunk_id: 'chunk-1',
    article_id: 'article-1',
    title: '示例文章',
    date: '2024-12-08',
    spine_color: '#8B4513',
    borrows: 12,
    tags: ['放疗', '科普'],
    content: '示例内容',
    cos_sim: 0.85,
    ...overrides,
  };
}

describe('searchVault', () => {
  const execute = vi.fn();

  beforeEach(() => {
    vi.mocked(getDb).mockReturnValue({ execute } as unknown as ReturnType<typeof getDb>);
    vi.mocked(embed).mockReset();
    vi.mocked(rerank).mockReset();
    execute.mockReset();
  });

  it('happy path: embeds query, runs db query, reranks, maps results', async () => {
    vi.mocked(embed).mockResolvedValue([[0.1, 0.2, 0.3]]);
    const rows = [
      makeRow({ chunk_id: 'c0', content: 'doc0' }),
      makeRow({ chunk_id: 'c1', content: 'doc1' }),
      makeRow({ chunk_id: 'c2', content: 'doc2' }),
      makeRow({ chunk_id: 'c3', content: 'doc3' }),
      makeRow({ chunk_id: 'c4', content: 'doc4' }),
    ];
    execute.mockResolvedValue(rows);
    vi.mocked(rerank).mockResolvedValue([
      { index: 1, score: 0.9 },
      { index: 0, score: 0.8 },
    ]);

    const out = await searchVault('me', '放疗', 7);

    expect(embed).toHaveBeenCalledTimes(1);
    expect(embed).toHaveBeenCalledWith(['放疗']);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(rerank).toHaveBeenCalledTimes(1);
    expect(rerank).toHaveBeenCalledWith('放疗', ['doc0', 'doc1', 'doc2', 'doc3', 'doc4'], 7);

    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      chunkId: 'c1',
      articleId: 'article-1',
      content: 'doc1',
      score: 0.9,
      year: '2024',
      date: '2024-12-08',
    });
    expect(out[1]).toMatchObject({
      chunkId: 'c0',
      content: 'doc0',
      score: 0.8,
    });
  });

  it('returns [] and skips rerank when no candidates', async () => {
    vi.mocked(embed).mockResolvedValue([[0.1, 0.2]]);
    execute.mockResolvedValue([]);

    const out = await searchVault('me', '空查询');

    expect(out).toEqual([]);
    expect(rerank).not.toHaveBeenCalled();
  });

  it('derives year from date prefix', async () => {
    vi.mocked(embed).mockResolvedValue([[0.1]]);
    execute.mockResolvedValue([makeRow({ date: '2024-12-08' })]);
    vi.mocked(rerank).mockResolvedValue([{ index: 0, score: 0.5 }]);

    const out = await searchVault('me', 'q');
    expect(out[0].year).toBe('2024');
    expect(out[0].date).toBe('2024-12-08');
  });

  it('handles null date as empty year + empty date', async () => {
    vi.mocked(embed).mockResolvedValue([[0.1]]);
    execute.mockResolvedValue([makeRow({ date: null })]);
    vi.mocked(rerank).mockResolvedValue([{ index: 0, score: 0.5 }]);

    const out = await searchVault('me', 'q');
    expect(out[0].year).toBe('');
    expect(out[0].date).toBe('');
  });

  it('passes userId into the db query', async () => {
    vi.mocked(embed).mockResolvedValue([[0.1]]);
    execute.mockResolvedValue([]);

    await searchVault('guwanxi', 'q');

    const callArg = execute.mock.calls[0][0];
    // drizzle SQL object — check serialized form contains the user_id filter
    const serialized = JSON.stringify(callArg);
    expect(serialized).toContain('user_id');
  });
});
