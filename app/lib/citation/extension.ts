// Registered by plan #10 (compliance system) once TipTap replaces contentEditable.
// Currently this file is shipped but NOT imported anywhere — phase #9 demos use
// React <CitationLink> components directly, not TipTap marks.

import { Mark, mergeAttributes } from '@tiptap/core';
import type { CitationKind } from './types';

export interface CitationMarkAttrs {
  citationId: string | null;
  kind: CitationKind;
  label: string;
}

export const CitationMark = Mark.create({
  name: 'citation',
  inclusive: false,
  addAttributes() {
    return {
      citationId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-citation-id'),
        renderHTML: (attrs) => attrs.citationId ? { 'data-citation-id': attrs.citationId } : {},
      },
      kind: {
        default: 'web' as CitationKind,
        parseHTML: (el) => (el.getAttribute('data-kind') ?? 'web'),
        renderHTML: (attrs) => ({ 'data-kind': attrs.kind }),
      },
      label: {
        default: '[1]',
        parseHTML: (el) => el.textContent ?? '[1]',
        renderHTML: () => ({}),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'sup[data-citation-id]' }];
  },
  renderHTML({ HTMLAttributes, mark }) {
    return ['sup',
      mergeAttributes(HTMLAttributes, {
        class: 'citation-sup',
        style: 'cursor:pointer; font-family:JetBrains Mono, monospace;',
      }),
      mark.attrs.label as string,
    ];
  },
});
