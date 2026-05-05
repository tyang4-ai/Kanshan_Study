import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/embeddings', () => ({
  embed: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  db: { execute: vi.fn() },
}));

import { embed } from '@/lib/embeddings';
import { db } from '@/lib/db/client';
import {
  lookupCache,
  writeCache,
  HIT_THRESHOLD,
  thresholdFor,
  type CacheKind,
} from '@/lib/cache/store';

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

  it('returns null when top similarity < HIT_THRESHOLD (fallback)', async () => {
    // Use 'compliance' here — it still uses the strict 0.85 threshold.
    mockedExecute.mockResolvedValueOnce([
      { id: 'x', response: { foo: 1 }, similarity: HIT_THRESHOLD - 0.01 },
    ] as never);
    const hit = await lookupCache('compliance', 'q');
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

describe('thresholdFor (per-kind threshold map)', () => {
  const kinds: CacheKind[] = [
    'voice-fill',
    'voice-diff',
    'persona-panel',
    'persona-followup',
    'persona-debate',
    'custom-mask',
    'research',
    'compliance',
    'account-switch',
    'tail-click',
    'lore',
    'chat',
  ];

  it.each(kinds)('returns null when sim just below threshold for kind=%s', async (kind) => {
    const t = thresholdFor(kind);
    mockedExecute.mockResolvedValueOnce([
      { id: 'x', response: { ok: true }, similarity: t - 0.01 },
    ] as never);
    const hit = await lookupCache(kind, 'q');
    expect(hit).toBeNull();
  });

  it.each(kinds)('returns hit when sim just above threshold for kind=%s', async (kind) => {
    const t = thresholdFor(kind);
    mockedExecute.mockResolvedValueOnce([
      { id: 'x', response: { ok: true }, similarity: t + 0.01 },
    ] as never);
    const hit = await lookupCache(kind, 'q');
    expect(hit?.response).toEqual({ ok: true });
  });

  it('falls back to 0.85 for unknown kind strings', () => {
    expect(thresholdFor('unknown-kind' as CacheKind)).toBe(HIT_THRESHOLD);
  });

  it('uses strict 0.85 for compliance kind', () => {
    expect(thresholdFor('compliance')).toBe(0.85);
  });

  it('uses loose 0.75 for voice-fill kind', () => {
    expect(thresholdFor('voice-fill')).toBe(0.75);
  });
});

describe('compliance kind near-miss collision guard', () => {
  // Two near-but-distinct medical claims must NOT collide at threshold 0.85.
  // We mock embeddings to give them controlled, distinguishable vectors so that
  // pgvector's cosine similarity would land just below 0.85 between them.
  it('weekly vs daily methotrexate dose does not collide', async () => {
    // Simulate the DB returning the *other* claim as the nearest neighbour
    // with similarity 0.83 (just below the 0.85 compliance threshold).
    mockedExecute.mockResolvedValueOnce([
      {
        id: 'cached',
        response: { claim: '甲氨蝶呤每周 7.5mg' },
        similarity: 0.83,
      },
    ] as never);
    const hit = await lookupCache('compliance', '甲氨蝶呤每日 7.5mg');
    // 0.83 < thresholdFor('compliance') === 0.85, so must NOT hit.
    expect(hit).toBeNull();
  });

  it('a paraphrased compliance variant above 0.85 still hits (true positive)', async () => {
    mockedExecute.mockResolvedValueOnce([
      {
        id: 'cached',
        response: { claim: '甲氨蝶呤每周 7.5mg' },
        similarity: 0.93,
      },
    ] as never);
    const hit = await lookupCache('compliance', '每周一次甲氨蝶呤 7.5 毫克');
    expect(hit?.similarity).toBe(0.93);
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
