// Strict allowlist renderer for ResearchSection.body. The seed JSON ships
// hand-authored HTML with three tags only — <p>, <sup data-cite-id="…">,
// <span class="research-mark"> — so we tokenize and re-emit as React elements
// instead of using dangerouslySetInnerHTML (persona-review 2026-05-11 P0
// flagged the XSS landmine: once /api/agents/research populates this from an
// LLM, raw injection becomes an exploitable surface).
//
// Anything outside the allowlist is text. Attribute keys outside the allowlist
// are dropped. No <script>, no event handlers, no <iframe>, no <a href> — by
// construction.

import { Fragment, type ReactNode, createElement } from 'react';

interface Token {
  kind: 'text' | 'p-open' | 'p-close' | 'sup-open' | 'sup-close' | 'span-open' | 'span-close';
  text?: string;
  citeId?: string;
}

const TAG_RE = /<(\/?)\s*(p|sup|span)([^>]*?)\s*>/gi;
const CITE_ID_RE = /data-cite-id\s*=\s*"([^"]*)"/i;
const RESEARCH_MARK_RE = /class\s*=\s*"\s*research-mark\s*"/i;

function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_RE.exec(html)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ kind: 'text', text: html.slice(lastIndex, match.index) });
    }
    const [, slash, tag, attrs] = match;
    const lowered = tag.toLowerCase();
    if (slash === '/') {
      if (lowered === 'p') tokens.push({ kind: 'p-close' });
      else if (lowered === 'sup') tokens.push({ kind: 'sup-close' });
      else if (lowered === 'span') tokens.push({ kind: 'span-close' });
    } else if (lowered === 'p') {
      tokens.push({ kind: 'p-open' });
    } else if (lowered === 'sup') {
      const citeMatch = CITE_ID_RE.exec(attrs);
      tokens.push({ kind: 'sup-open', citeId: citeMatch ? citeMatch[1] : undefined });
    } else if (lowered === 'span') {
      if (RESEARCH_MARK_RE.test(attrs)) tokens.push({ kind: 'span-open' });
      // Spans without the allowlisted class are dropped; their text content
      // continues to render via the surrounding text tokens.
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < html.length) tokens.push({ kind: 'text', text: html.slice(lastIndex) });
  return tokens;
}

export function renderResearchBody(html: string): ReactNode {
  // Per-call counter — was module-scope, which made server-rendered and
  // client-rendered keys diverge after the first call and caused React
  // hydration warnings (R2 code-quality persona P0 2026-05-11).
  let renderCounter = 0;
  const tokens = tokenize(html);
  // Group into <p> blocks; each <p> wraps its inline children. Inline tokens
  // (sup, span, text) outside a <p> render as siblings.
  const blocks: ReactNode[] = [];
  let inline: ReactNode[] = [];
  let inP = false;
  let inSup = false;
  let inSpan = false;
  let supChildren: ReactNode[] = [];
  let supCiteId: string | undefined;
  let spanChildren: ReactNode[] = [];

  const pushInline = (node: ReactNode): void => {
    if (inSpan) spanChildren.push(node);
    else if (inSup) supChildren.push(node);
    else inline.push(node);
  };

  const closeP = (): void => {
    if (!inP) return;
    blocks.push(createElement('p', { key: `p-${renderCounter++}`, style: { margin: '0 0 10px' } }, ...inline));
    inline = [];
    inP = false;
  };

  for (const t of tokens) {
    switch (t.kind) {
      case 'text':
        if (t.text) pushInline(t.text);
        break;
      case 'p-open':
        closeP();
        inP = true;
        break;
      case 'p-close':
        closeP();
        break;
      case 'sup-open':
        inSup = true;
        supChildren = [];
        supCiteId = t.citeId;
        break;
      case 'sup-close':
        if (inSup) {
          const id = supCiteId ?? '';
          const node = createElement(
            'sup',
            {
              key: `sup-${renderCounter++}`,
              'data-cite-id': id,
              style: { color: '#1772F6', cursor: 'pointer', marginLeft: 1 },
            },
            ...supChildren,
          );
          if (inSpan) spanChildren.push(node);
          else if (inP) inline.push(node);
          else blocks.push(node);
        }
        inSup = false;
        supChildren = [];
        supCiteId = undefined;
        break;
      case 'span-open':
        inSpan = true;
        spanChildren = [];
        break;
      case 'span-close':
        if (inSpan) {
          const node = createElement(
            'span',
            {
              key: `span-${renderCounter++}`,
              className: 'research-mark',
              style: { background: 'rgba(184,85,67,0.12)', padding: '0 2px' },
            },
            ...spanChildren,
          );
          if (inP) inline.push(node);
          else blocks.push(node);
        }
        inSpan = false;
        spanChildren = [];
        break;
    }
  }
  closeP();
  // Drain trailing inline tokens if the body had no <p> wrapper.
  if (inline.length) blocks.push(createElement(Fragment, { key: `frag-${renderCounter++}` }, ...inline));
  return blocks;
}
