import type { MarginSealKind } from '@/components/editor/MarginSeal';

const DEFAULT_TEXT: Record<MarginSealKind, string> = {
  reviewed: '审',
  flag: '疑',
  sourced: '据',
};

export interface MarginSealOpenDetail {
  kind: MarginSealKind;
  text: string;
  rect: { left: number; top: number; right: number; bottom: number };
}

export const MARGIN_SEAL_OPEN_EVENT = 'marginseal:open';

export function buildMarginSealChit(kind: MarginSealKind, text?: string): HTMLSpanElement {
  const el = document.createElement('span');
  const display = text ?? DEFAULT_TEXT[kind];
  el.className = `margin-seal margin-seal-${kind}`;
  el.dataset.kind = kind;
  el.textContent = display;
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', `margin seal ${kind}`);
  el.style.cursor = 'pointer';

  const dispatch = (ev: Event) => {
    ev.preventDefault();
    ev.stopPropagation();
    const r = el.getBoundingClientRect();
    const detail: MarginSealOpenDetail = {
      kind,
      text: display,
      rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
    };
    el.dispatchEvent(
      new CustomEvent(MARGIN_SEAL_OPEN_EVENT, { detail, bubbles: true }),
    );
  };

  el.addEventListener('mousedown', dispatch);
  el.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') dispatch(ev);
  });

  return el;
}
