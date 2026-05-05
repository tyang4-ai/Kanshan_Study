import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/embeddings', () => ({
  embed: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  db: { execute: vi.fn() },
}));

import { embed } from '@/lib/embeddings';
import { db } from '@/lib/db/client';
import { lookupCache, writeCache, HIT_THRESHOLD } from '@/lib/cache/store';

const mockedEmbed = vi.mocked(embed);
const mockedExecute = vi.mocked(db.execute);

beforeEach(() => {
  vi.clearAllMocks();
  mockedEmbed.mockResolvedValue([[0.1, 0.2, 0.3]]);
});

describe('lookupCache', () => {
  it('returns null when no rows match', async () => {
    mockedExecute.mockResolvedValueOnce([] as never);
    const hit = await lookupCache('voice-fill', 'q');
    expect(hit).toBeNull();
  });

  it('returns null when top similarity < HIT_THRESHOLD', async () => {
    mockedExecute.mockResolvedValueOnce([
      { id: 'x', response: { foo: 1 }, similarity: HIT_THRESHOLD - 0.01 },
    ] as never);
    const hit = await lookupCache('voice-fill', 'q');
    expect(hit).toBeNull();
  });

  it('returns response when similarity ≥ HIT_THRESHOLD', async () => {
    mockedExecute.mockResolvedValueOnce([
      { id: 'x', response: { foo: 1 }, similarity: 0.92 },
    ] as never);
    const hit = await lookupCache<{ foo: number }>('voice-fill', 'q');
    expect(hit?.response).toEqual({ foo: 1 });
    expect(hit?.similarity).toBe(0.92);
  });

  it('handles string-typed similarity from PG numeric → number', async () => {
    mockedExecute.mockResolvedValueOnce([
      { id: 'x', response: { foo: 1 }, similarity: '0.91' },
    ] as never);
    const hit = await lookupCache('voice-fill', 'q');
    expect(hit?.similarity).toBe(0.91);
  });
});

describe('writeCache', () => {
  it('inserts with deterministic id format `${kind}:...`', async () => {
    mockedExecute.mockResolvedValueOnce([] as never);
    await writeCache('voice-fill', 'q', { ok: true });
    expect(mockedExecute).toHaveBeenCalledTimes(1);
  });

  it('embeds the intent text once', async () => {
    mockedExecute.mockResolvedValueOnce([] as never);
    await writeCache('voice-fill', 'q', { ok: true });
    expect(mockedEmbed).toHaveBeenCalledTimes(1);
    expect(mockedEmbed).toHaveBeenCalledWith(['q']);
  });
});
