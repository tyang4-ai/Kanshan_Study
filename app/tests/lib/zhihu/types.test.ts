import { describe, it, expect } from 'vitest';
import {
  HotListItem,
  SearchResult,
  ZhidaAnswer,
  FeedPage,
} from '@/lib/zhihu/types';

describe('zhihu Zod schemas', () => {
  describe('HotListItem', () => {
    it('accepts minimal API shape (id + title only)', () => {
      const parsed = HotListItem.parse({ id: 1, title: 'foo' });
      expect(parsed.id).toBe(1);
    });

    it('accepts existing seed JSON shape (with rank, tags, vibes)', () => {
      const parsed = HotListItem.parse({
        id: 'rel-1',
        rank: 1,
        title: 'AI 写作工具是否会让答主声音同质化？',
        heat: '8.2 万',
        ageHours: 2,
        ageLabel: '2 小时',
        tags: ['答主圈'],
        hot: true,
        vibes: 'related',
        vibesFox: 'shi',
      });
      expect(parsed.tags).toEqual(['答主圈']);
    });

    it('rejects malformed id (boolean)', () => {
      expect(() => HotListItem.parse({ id: true, title: 'foo' })).toThrow();
    });
  });

  describe('SearchResult', () => {
    it('accepts academic-citation shape', () => {
      const parsed = SearchResult.parse({
        id: 'art-aerts-2014',
        type: 'article',
        title: 'Decoding tumour phenotype',
      });
      expect(parsed.type).toBe('article');
    });

    it('rejects unknown type', () => {
      expect(() =>
        SearchResult.parse({ id: 'x', type: 'tweet', title: 'foo' }),
      ).toThrow();
    });
  });

  describe('ZhidaAnswer', () => {
    it('accepts text + empty citations', () => {
      const parsed = ZhidaAnswer.parse({ text: 'hello', citations: [] });
      expect(parsed.text).toBe('hello');
    });

    it('rejects missing text', () => {
      expect(() => ZhidaAnswer.parse({ citations: [] })).toThrow();
    });
  });

  describe('FeedPage', () => {
    it('accepts items + null cursor', () => {
      const parsed = FeedPage.parse({ items: [], cursor: null });
      expect(parsed.cursor).toBeNull();
    });

    it('rejects cursor of wrong type', () => {
      expect(() => FeedPage.parse({ items: [], cursor: 42 })).toThrow();
    });
  });
});
