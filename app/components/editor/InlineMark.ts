import { Mark, mergeAttributes } from '@tiptap/core';

export type InlineMarkKind = 'ai-touched' | 'claim' | 'hedge';

export interface InlineMarkAttrs {
  kind: InlineMarkKind;
  hint: string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineMark: {
      setInlineMark: (attrs: { kind: InlineMarkKind; hint?: string | null }) => ReturnType;
      unsetInlineMark: () => ReturnType;
    };
  }
}

export const InlineMark = Mark.create({
  name: 'inlineMark',

  addAttributes() {
    return {
      kind: {
        default: 'ai-touched' as InlineMarkKind,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-mark-kind'),
        renderHTML: (attrs: InlineMarkAttrs) => ({ 'data-mark-kind': attrs.kind }),
      },
      hint: {
        default: null as string | null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-mark-hint'),
        renderHTML: (attrs: InlineMarkAttrs) =>
          attrs.hint ? { 'data-mark-hint': attrs.hint, title: attrs.hint } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-mark-kind]' }];
  },

  renderHTML({ HTMLAttributes, mark }) {
    const kind = (mark.attrs as InlineMarkAttrs).kind;
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: `inline-mark-${kind}` }),
      0,
    ];
  },

  addCommands() {
    return {
      setInlineMark:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetInlineMark:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

export default InlineMark;
