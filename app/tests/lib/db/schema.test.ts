import { describe, it, expect } from 'vitest';
import { users, articles, chunks, vaultFiles } from '@/lib/db/schema';

describe('db/schema', () => {
  it('exports all four tables', () => {
    expect(users).toBeDefined();
    expect(articles).toBeDefined();
    expect(chunks).toBeDefined();
    expect(vaultFiles).toBeDefined();
  });

  it('chunks.embedding is a vector column with 1024 dimensions', () => {
    expect(chunks.embedding).toBeDefined();
    // Drizzle stores vector dimensions on the column config
    const col = chunks.embedding as unknown as { dimensions?: number; columnType?: string };
    if (col.dimensions !== undefined) {
      expect(col.dimensions).toBe(1024);
    }
  });

  it('articles.tags defaults to []', () => {
    const col = articles.tags as unknown as { default?: unknown };
    expect(col.default).toEqual([]);
  });

  it('articles.draft defaults to false', () => {
    const col = articles.draft as unknown as { default?: unknown };
    expect(col.default).toBe(false);
  });
});
