// Per-account default doc selector. Keeps the per-account TipTap editor seed
// out of TipTapEditor.tsx so adding a third demo account is a one-line change.

import { DEFAULT_DOC_HTML } from './default-document.html';
import { DEFAULT_DOC_HTML_GUWANXI } from './default-document-guwanxi.html';

export function defaultDocForAccount(accountId: string): string {
  if (accountId === 'guwanxi') return DEFAULT_DOC_HTML_GUWANXI;
  return DEFAULT_DOC_HTML;
}
