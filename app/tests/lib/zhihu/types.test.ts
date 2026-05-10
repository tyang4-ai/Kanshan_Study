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

  describe('Story (hackathon_story/list)', () => {
    it('accepts minimal shape (work_id + title only)', async () => {
      const { Story } = await import('@/lib/zhihu/types');
      const parsed = Story.parse({ work_id: '1644038836790169600', title: '秦始皇登月计划' });
      expect(parsed.work_id).toBe('1644038836790169600');
    });

    it('accepts full shape with labels + cover URLs', async () => {
      const { Story } = await import('@/lib/zhihu/types');
      const parsed = Story.parse({
        work_id: '1487746545537290240',
        title: '人脸解锁失败',
        artwork: 'https://picx.zhimg.com/x.jpg',
        tab_artwork: 'https://picx.zhimg.com/y.jpg',
        description: '悬疑短篇',
        labels: ['悬疑'],
      });
      expect(parsed.labels).toEqual(['悬疑']);
    });

    it('rejects missing work_id', async () => {
      const { Story } = await import('@/lib/zhihu/types');
      expect(() => Story.parse({ title: 'foo' })).toThrow();
    });
  });

  describe('StoryDetail (hackathon_story/detail)', () => {
    it('accepts chapter shape with content', async () => {
      const { StoryDetail } = await import('@/lib/zhihu/types');
      const parsed = StoryDetail.parse({
        work_id: '1644038836790169600',
        chapter_name: '第一章',
        author_name: '六酒',
        labels: ['史脑洞'],
        introduction: '导语文本',
        content: '正文段落一\n正文段落二',
      });
      expect(parsed.content).toContain('正文段落一');
    });

    it('rejects missing content (required for chapter detail)', async () => {
      const { StoryDetail } = await import('@/lib/zhihu/types');
      expect(() =>
        StoryDetail.parse({ work_id: 'x', chapter_name: 'y', author_name: 'z' }),
      ).toThrow();
    });
  });
});
