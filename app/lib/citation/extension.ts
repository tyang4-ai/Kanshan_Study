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
  renderHTML({ HTMLAttributes }) {
    // R4 presentation + casual user persona-review 2026-05-11 P0: the third
    // array element was `mark.attrs.label` (a string), which ProseMirror
    // rendered as literal text *in addition to* the marked text content,
    // producing `<sup>[3][3]</sup>` per render cycle. Each persistence round
    // doubled the labels — judges saw `[3][3][3][3][3][v7][v7][v7][v7]`.
    // The fix: use 0 as the content placeholder so marked text goes there.
    return ['sup',
      mergeAttributes(HTMLAttributes, {
        class: 'citation-sup',
        style: 'cursor:pointer; font-family:JetBrains Mono, monospace;',
      }),
      0,
    ];
  },
});
