import type { Citation } from './types';

export type OpenVaultTab = (props: { scrollToArticleId: string }) => void;

export function buildCitationOnClick(
  citation: Citation,
  openVaultTab: OpenVaultTab,
): (e?: { preventDefault?: () => void }) => void {
  return (e) => {
    e?.preventDefault?.();
    if (citation.kind === 'web') {
      window.open(citation.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (citation.kind === 'vault') {
      openVaultTab({ scrollToArticleId: citation.articleId });
      return;
    }
    // zhihu
    const url = citation.answerUrl || `https://www.zhihu.com/people/${citation.handle}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };
}
