// Locked union per CLAUDE.md "3 citation kinds" — matches mockup CiteBadge + plan #10 SealStamp + plan #11 ResearchTab.
export type CitationKind = 'web' | 'vault' | 'zhihu';

export type WebCitation =   { kind: 'web';   id: string; index: number; url: string; title?: string; demo?: boolean };
export type VaultCitation = { kind: 'vault'; id: string; index: number; articleId: string; sourceTitle: string; preview: string };
export type ZhihuCitation = { kind: 'zhihu'; id: string; handle: string; displayName: string; answerUrl: string; bio?: string };

export type Citation = WebCitation | VaultCitation | ZhihuCitation;

export function citationLabel(c: Citation): string {
  if (c.kind === 'web')   return `[${c.index}]`;
  if (c.kind === 'vault') return `[v${c.index}]`;
  return `[@${c.displayName}]`;
}

const KINDS: readonly CitationKind[] = ['web', 'vault', 'zhihu'];
export function isCitationKind(x: unknown): x is CitationKind {
  return typeof x === 'string' && (KINDS as readonly string[]).includes(x);
}

export function webCitation(p: Omit<WebCitation, 'kind'>): WebCitation {
  return { kind: 'web', ...p };
}
export function vaultCitation(p: Omit<VaultCitation, 'kind'>): VaultCitation {
  return { kind: 'vault', ...p };
}
export function zhihuCitation(p: Omit<ZhihuCitation, 'kind'>): ZhihuCitation {
  return { kind: 'zhihu', ...p };
}
