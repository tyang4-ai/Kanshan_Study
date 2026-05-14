import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { buildMarginSealChit } from '@/components/compliance/MarginSealChit';
import {
  findProvenanceForChit,
  findCrossFoxFollowups,
  useProvenanceStore,
} from '@/lib/store/provenance';
import type { ProvenanceEntry } from '@/lib/store/provenance';

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

const CROSS_FOX_LABEL: Record<string, string> = {
  mo: '看墨',
  shui: '看水',
  shan: '看山',
  wen: '看文',
  wen2: '看纹',
  dian: '看典',
  shi: '看势',
  jing: '看镜',
  xin: '看心',
};

function describeFollowup(e: ProvenanceEntry): string {
  const name = CROSS_FOX_LABEL[e.fox] ?? e.fox;
  if (e.relatedAction === 'avoided') return `${name} 已绕开`;
  if (e.relatedAction === 'sourced-after-flag') return `${name} 已补出处`;
  return `${name} 已回应`;
}

// R5 (P1 2026-05-13): persistent left-margin annotation. Renders a small
// inline span next to the chit reading "· 看墨 已绕开 · 看水 已为此段补出处"
// whenever the chit's matching provenance entry has cross-fox followups.
// This promotes the cross-fox interaction from a hidden-in-popover detail
// to a visible margin annotation — emmett's R4 ask.
function buildCrossFoxAnnotation(text: string): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = 'margin-seal-crossfox';
  el.textContent = text;
  el.style.marginLeft = '6px';
  el.style.fontSize = '10.5px';
  el.style.color = 'rgba(31,91,71,0.85)';
  el.style.fontFamily = '"Noto Serif SC", serif';
  el.style.letterSpacing = '0.5px';
  el.style.fontStyle = 'italic';
  el.setAttribute('data-testid', 'margin-seal-crossfox-annotation');
  return el;
}

function buildDecorations(doc: PMNode, opts: MarginSealOptions): DecorationSet {
  const matches = opts.matchesFor(doc);
  const decos: Decoration[] = [];
  for (const m of matches) {
    decos.push(
      Decoration.widget(m.from, () => buildMarginSealChit(m.kind, m.text), {
        side: -1,
        ignoreSelection: true,
      }),
    );
    // Cross-fox annotation — look up provenance entry that matches this chit
    // and render any followup names inline. Lookup is cheap (linear scan over
    // a small store) and runs only on doc change.
    const provenance = findProvenanceForChit(m.kind, m.text ?? '');
    if (provenance) {
      const followups = findCrossFoxFollowups(provenance.id);
      if (followups.length > 0) {
        const text = '· ' + followups.map(describeFollowup).join(' · ');
        decos.push(
          Decoration.widget(m.from, () => buildCrossFoxAnnotation(text), {
            side: -1,
            ignoreSelection: true,
          }),
        );
      }
    }
  }
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
    let unsubscribe: (() => void) | null = null;
    let pluginView: ((tr: unknown) => void) | null = null;
    return [
      new Plugin<DecorationSet>({
        key: marginSealPluginKey,
        state: {
          init: (_config, state) => buildDecorations(state.doc, opts),
          apply: (tr, old) => {
            // Recompute decorations on any doc change OR when the provenance
            // store dispatches a refresh meta (cross-fox followups changed).
            if (!tr.docChanged && !tr.getMeta('marginSeal:refresh')) return old;
            return buildDecorations(tr.doc, opts);
          },
        },
        props: {
          decorations(state) {
            return marginSealPluginKey.getState(state) ?? null;
          },
        },
        view(editorView) {
          // R5 (P1 2026-05-13): subscribe to the provenance store. Whenever a
          // fox records a new entry (esp. cross-fox `relatedTo` links), fire
          // a no-op tx with a `marginSeal:refresh` meta so `apply` above
          // rebuilds the decorations and the inline annotation shows up.
          unsubscribe = useProvenanceStore.subscribe(() => {
            try {
              const tr = editorView.state.tr.setMeta('marginSeal:refresh', true);
              editorView.dispatch(tr);
            } catch {
              /* editor torn down — safe to ignore */
            }
          });
          pluginView = () => {};
          return {
            destroy() {
              if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
              }
              pluginView = null;
            },
          };
        },
      }),
    ];
  },
});

export default MarginSeal;
