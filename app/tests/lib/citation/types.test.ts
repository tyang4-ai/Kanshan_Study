import { describe, it, expect } from 'vitest';
import {
  citationLabel,
  isCitationKind,
  webCitation,
  vaultCitation,
  zhihuCitation,
} from '@/lib/citation/types';

describe('citationLabel', () => {
  it('formats web citation as [N]', () => {
    const c = webCitation({ id: 'w1', index: 3, url: 'https://example.com' });
    expect(citationLabel(c)).toBe('[3]');
  });

  it('formats vault citation as [vN]', () => {
    const c = vaultCitation({
      id: 'v1',
      index: 7,
      articleId: 'a1',
      sourceTitle: 'Source',
      preview: 'snip',
    });
    expect(citationLabel(c)).toBe('[v7]');
  });

  it('formats zhihu citation with displayName 冷泉 as [@冷泉]', () => {
    const c = zhihuCitation({
      id: 'z1',
      handle: 'lengquan',
      displayName: '冷泉',
      answerUrl: 'https://www.zhihu.com/answer/1',
    });
    expect(citationLabel(c)).toBe('[@冷泉]');
  });

  it('formats zhihu citation with unicode displayName 顾婉昔 as [@顾婉昔]', () => {
    const c = zhihuCitation({
      id: 'z2',
      handle: 'guwanxi',
      displayName: '顾婉昔',
      answerUrl: 'https://www.zhihu.com/answer/2',
    });
    expect(citationLabel(c)).toBe('[@顾婉昔]');
  });
});

describe('isCitationKind', () => {
  it('returns true for "web"', () => {
    expect(isCitationKind('web')).toBe(true);
  });

  it('returns true for "vault"', () => {
    expect(isCitationKind('vault')).toBe(true);
  });

  it('returns true for "zhihu"', () => {
    expect(isCitationKind('zhihu')).toBe(true);
  });

  it('returns false for unknown string "foo"', () => {
    expect(isCitationKind('foo')).toBe(false);
  });

  it('returns false for non-string 7', () => {
    expect(isCitationKind(7)).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isCitationKind(null)).toBe(false);
    expect(isCitationKind(undefined)).toBe(false);
  });
});

describe('citation constructors', () => {
  it('webCitation returns object with kind="web"', () => {
    const c = webCitation({ id: 'w1', index: 1, url: 'https://x.com', title: 't' });
    expect(c.kind).toBe('web');
    expect(c.url).toBe('https://x.com');
    expect(c.title).toBe('t');
  });

  it('vaultCitation returns object with kind="vault"', () => {
    const c = vaultCitation({
      id: 'v1',
      index: 2,
      articleId: 'a1',
      sourceTitle: 'S',
      preview: 'p',
    });
    expect(c.kind).toBe('vault');
    expect(c.articleId).toBe('a1');
  });

  it('zhihuCitation returns object with kind="zhihu"', () => {
    const c = zhihuCitation({
      id: 'z1',
      handle: 'h',
      displayName: 'D',
      answerUrl: 'https://www.zhihu.com/answer/1',
    });
    expect(c.kind).toBe('zhihu');
    expect(c.displayName).toBe('D');
  });
});
