import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildCitationOnClick } from '@/lib/citation/click-router';
import type { Citation, WebCitation, VaultCitation, ZhihuCitation } from '@/lib/citation/types';

const web: WebCitation = {
  kind: 'web',
  id: 'w1',
  index: 3,
  url: 'https://example.com/article',
  title: 'Example Article',
};

const vault: VaultCitation = {
  kind: 'vault',
  id: 'v1',
  index: 7,
  articleId: 'art-42',
  sourceTitle: '我的论文 #42',
  preview: '这是一段预览。',
};

const zhihu: ZhihuCitation = {
  kind: 'zhihu',
  id: 'z1',
  handle: 'lengquan',
  displayName: '冷泉',
  answerUrl: 'https://www.zhihu.com/question/1/answer/2',
  bio: '科普答主',
};

describe('buildCitationOnClick', () => {
  let openSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });
  afterEach(() => {
    openSpy.mockRestore();
  });

  it('web → opens c.url in new tab with noopener,noreferrer', () => {
    const openVault = vi.fn();
    buildCitationOnClick(web, openVault)();
    expect(openSpy).toHaveBeenCalledWith(web.url, '_blank', 'noopener,noreferrer');
    expect(openVault).not.toHaveBeenCalled();
  });

  it('vault → calls openVaultTab with scrollToArticleId; window.open NOT called', () => {
    const openVault = vi.fn();
    buildCitationOnClick(vault, openVault)();
    expect(openVault).toHaveBeenCalledWith({ scrollToArticleId: 'art-42' });
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('zhihu with answerUrl → opens answerUrl', () => {
    const openVault = vi.fn();
    buildCitationOnClick(zhihu, openVault)();
    expect(openSpy).toHaveBeenCalledWith(zhihu.answerUrl, '_blank', 'noopener,noreferrer');
  });

  it('zhihu without answerUrl → opens fallback /people/{handle}', () => {
    const openVault = vi.fn();
    const z: Citation = { ...zhihu, answerUrl: '' };
    buildCitationOnClick(z, openVault)();
    expect(openSpy).toHaveBeenCalledWith(
      'https://www.zhihu.com/people/lengquan',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('calls e.preventDefault when an event-like object is passed', () => {
    const openVault = vi.fn();
    const preventDefault = vi.fn();
    buildCitationOnClick(web, openVault)({ preventDefault });
    expect(preventDefault).toHaveBeenCalled();
  });

  it('does not throw when no event passed', () => {
    const openVault = vi.fn();
    expect(() => buildCitationOnClick(web, openVault)()).not.toThrow();
  });
});
