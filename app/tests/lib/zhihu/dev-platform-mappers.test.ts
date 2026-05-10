import { describe, it, expect } from 'vitest';
import { __test } from '@/lib/zhihu';

const { mapDpHotItem, mapDpSearchItem } = __test;

describe('developer.zhihu.com response mappers', () => {
  describe('mapDpHotItem', () => {
    it('maps PascalCase hot_list item to camelCase HotListItem', () => {
      const out = mapDpHotItem(
        {
          Title: '如何评价某个热点问题？',
          Url: 'https://www.zhihu.com/question/123456789',
          ThumbnailUrl: 'https://pic1.zhimg.com/foo.jpg',
          Summary: '这是该问题的内容摘要',
        },
        0,
      );
      expect(out).toMatchObject({
        id: 'https://www.zhihu.com/question/123456789',
        title: '如何评价某个热点问题？',
        rank: 1,
        excerpt: '这是该问题的内容摘要',
        url: 'https://www.zhihu.com/question/123456789',
      });
    });

    it('uses synthetic id when Url is empty', () => {
      const out = mapDpHotItem({ Title: 'x', Url: '' }, 4);
      expect(out.id).toBe('hot-4');
      expect(out.rank).toBe(5);
    });

    it('drops empty Summary to undefined', () => {
      const out = mapDpHotItem({ Title: 'x', Url: 'u', Summary: '' }, 0);
      expect(out.excerpt).toBeUndefined();
    });
  });

  describe('mapDpSearchItem', () => {
    it('maps Article ContentType + EditTime to ISO string', () => {
      const out = mapDpSearchItem({
        Title: 'RAG 评测方法综述',
        ContentType: 'Article',
        ContentID: '123456789',
        ContentText: '本文介绍了主流 RAG...',
        Url: 'https://zhuanlan.zhihu.com/p/123456789',
        CommentCount: 15,
        VoteUpCount: 128,
        AuthorName: '张三',
        EditTime: 1710000000,
        AuthorityLevel: '2',
        RankingScore: 0.98,
        CommentInfoList: [{ Content: '一条精选评论' }],
      });
      expect(out).toMatchObject({
        id: '123456789',
        type: 'article',
        title: 'RAG 评测方法综述',
        abstract: '本文介绍了主流 RAG...',
        voteUp: 128,
        commentCount: 15,
        relevanceScore: 0.98,
        authorityScore: 2,
        featuredComment: '一条精选评论',
      });
      expect(out.author?.displayName).toBe('张三');
      expect(out.publishedAt).toBe(new Date(1710000000 * 1000).toISOString());
    });

    it('maps Answer and Question content types', () => {
      const answer = mapDpSearchItem({
        Title: 't',
        ContentType: 'Answer',
        ContentID: '1',
      });
      expect(answer.type).toBe('answer');

      const question = mapDpSearchItem({
        Title: 't',
        ContentType: 'Question',
        ContentID: '2',
      });
      expect(question.type).toBe('question');
    });

    it('handles missing optional fields gracefully', () => {
      const out = mapDpSearchItem({
        Title: 't',
        ContentType: 'Article',
        ContentID: '1',
      });
      expect(out.author).toBeUndefined();
      expect(out.publishedAt).toBeUndefined();
      expect(out.authorityScore).toBeUndefined();
      expect(out.featuredComment).toBeUndefined();
    });
  });
});
