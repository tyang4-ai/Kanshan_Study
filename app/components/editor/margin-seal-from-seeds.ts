import type { Node as PMNode } from '@tiptap/pm/model';
import type { MarginSealMatch, MarginSealKind } from './MarginSeal';

export interface MarginSealSeed {
  textNeedle: string;
  kind: MarginSealKind;
}

export function buildMatches(doc: PMNode, seeds: MarginSealSeed[]): MarginSealMatch[] {
  const remaining = seeds.map((s, idx) => ({ ...s, idx, used: false }));
  const matches: MarginSealMatch[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText) return true;
    const text = node.text ?? '';
    for (const seed of remaining) {
      if (seed.used) continue;
      const i = text.indexOf(seed.textNeedle);
      if (i === -1) continue;
      const from = pos + i;
      const to = from + seed.textNeedle.length;
      matches.push({ from, to, kind: seed.kind });
      seed.used = true;
    }
    return true;
  });

  matches.sort((a, b) => a.from - b.from);
  return matches;
}
