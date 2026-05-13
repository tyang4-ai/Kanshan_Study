// 看心 live-flag decoration. Visual-only overlay (ProseMirror Decoration)
// over sentences that 看心 has flagged. Doesn't modify the underlying doc
// so markdown serialization round-trips unaffected and copy/paste excludes
// the highlight.
//
// Ranges are pushed in via the `set-xin-flags` plugin transaction meta from
// the debounced scan in TipTapEditor. Each range gets a span with class
// `kanshan-xin-flag` — styled in app/app/globals.css as a wavy red underline
// with a tooltip on hover.

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface XinFlagRange {
  from: number;
  to: number;
  /** Why this sentence got flagged — shows up as a tooltip. */
  reason: string;
}

const XIN_META = 'xin-flags';

export const xinFlagPluginKey = new PluginKey<DecorationSet>('xin-flags');

export const XinFlag = Extension.create({
  name: 'xinFlag',

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: xinFlagPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldSet) {
            const flags = tr.getMeta(XIN_META) as XinFlagRange[] | undefined;
            if (flags !== undefined) {
              // Replace: build a brand-new DecorationSet from the incoming
              // ranges. Skipped ranges that are out of bounds (doc shrank
              // between scan and apply) are dropped silently.
              const decos: Decoration[] = [];
              const docSize = tr.doc.content.size;
              for (const r of flags) {
                if (r.from < 0 || r.to > docSize || r.from >= r.to) continue;
                decos.push(
                  Decoration.inline(r.from, r.to, {
                    class: 'kanshan-xin-flag',
                    title: r.reason,
                  }),
                );
              }
              return DecorationSet.create(tr.doc, decos);
            }
            // Map old decorations through the new transaction so they stay
            // attached to the right text as the user keeps typing.
            return oldSet.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

/** Imperative dispatch — call from outside the TipTap commands API. */
export function setXinFlags(editor: { view: { state: { tr: unknown }; dispatch: (tr: unknown) => void } }, flags: XinFlagRange[]): void {
  const view = (editor as unknown as { view: { state: { tr: { setMeta: (k: string, v: unknown) => unknown } }; dispatch: (tr: unknown) => void } }).view;
  if (!view) return;
  const tr = view.state.tr.setMeta(XIN_META, flags);
  view.dispatch(tr);
}
