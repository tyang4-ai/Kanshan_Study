import type { MarginSealKind } from '@/components/editor/MarginSeal';

const DEFAULT_TEXT: Record<MarginSealKind, string> = {
  reviewed: '审',
  flag: '疑',
  sourced: '据',
};

export function buildMarginSealChit(kind: MarginSealKind, text?: string): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = `margin-seal margin-seal-${kind}`;
  el.dataset.kind = kind;
  el.textContent = text ?? DEFAULT_TEXT[kind];
  return el;
}
