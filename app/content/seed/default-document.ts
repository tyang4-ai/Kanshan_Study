// Single default document. The dual-account branch ('me' vs 顾婉昔) was
// removed 2026-05-13 along with the account switcher. Everyone now opens
// onto the same demo-day walkthrough doc, which Phase E replaces with the
// glioblastoma guide.

import { DEFAULT_DOC_HTML } from './default-document.html';

export function defaultDocForAccount(_accountId?: string): string {
  return DEFAULT_DOC_HTML;
}

export { DEFAULT_DOC_HTML };
