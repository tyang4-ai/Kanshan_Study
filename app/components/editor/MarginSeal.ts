import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { buildMarginSealChit } from '@/components/compliance/MarginSealChit';

export type MarginSealKind = 'reviewed' | 'flag' | 'sourced';

export interface MarginSealMatch {
  from: number;
  to: number;
  kind: MarginSealKind;
  text?: string;
}

export interface MarginSealOptions {
  matchesFor: (doc: PMNode) => MarginSealMatch[];
}

const marginSealPluginKey = new PluginKey<DecorationSet>('marginSeal');

function buildDecorations(doc: PMNode, opts: MarginSealOptions): DecorationSet {
  const matches = opts.matchesFor(doc);
  const decos = matches.map((m) =>
    Decoration.widget(m.from, () => buildMarginSealChit(m.kind, m.text), {
      side: -1,
      ignoreSelection: true,
    }),
  );
  return DecorationSet.create(doc, decos);
}

export const MarginSeal = Extension.create<MarginSealOptions>({
  name: 'marginSeal',

  addOptions() {
    return {
      matchesFor: () => [],
    };
  },

  addProseMirrorPlugins() {
    const opts = this.options;
    return [
      new Plugin<DecorationSet>({
        key: marginSealPluginKey,
        state: {
          init: (_config, state) => buildDecorations(state.doc, opts),
          apply: (tr, old) => {
            if (!tr.docChanged) return old;
            return buildDecorations(tr.doc, opts);
          },
        },
        props: {
          decorations(state) {
            return marginSealPluginKey.getState(state) ?? null;
          },
        },
      }),
    ];
  },
});

export default MarginSeal;
