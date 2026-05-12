import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { FoxGuideCard } from '@/components/atoms/FoxGuideCard';
import { FOXES, type FoxId } from '@/lib/foxes/registry';
import guidesData from '@/content/seed/fox-guides.json';

interface FoxGuide {
  id: FoxId;
  name: string;
  verb: string;
  canHelp: string;
  whenToCall: string;
}

const GUIDES = guidesData as FoxGuide[];

function makeRect(overrides: Partial<DOMRect> = {}): DOMRect {
  const base = {
    x: 100, y: 100, top: 100, left: 100, right: 122, bottom: 122,
    width: 22, height: 22,
  };
  const merged = { ...base, ...overrides };
  return {
    ...merged,
    toJSON: () => merged,
  } as DOMRect;
}

const VERB_LABEL: Record<string, string> = {
  orchestrate: '总调度',
  灵感激发: '灵感激发',
  思路梳理: '思路梳理',
  内容精加工: '内容精加工',
};

describe('FoxGuideCard', () => {
  it('renders for each of the 9 FoxIds with correct name + verb pill + canHelp + whenToCall', () => {
    for (const guide of GUIDES) {
      const { unmount } = render(
        <FoxGuideCard
          foxId={guide.id}
          anchorRect={makeRect()}
          onClose={() => {}}
        />,
      );
      const card = screen.getByTestId('fox-guide-card');
      expect(card.getAttribute('data-fox-id')).toBe(guide.id);
      expect(card).toHaveTextContent(guide.name);
      expect(screen.getByTestId('fox-guide-card-verb-pill').textContent).toBe(
        VERB_LABEL[guide.verb] ?? guide.verb,
      );
      expect(screen.getByTestId('fox-guide-card-can-help').textContent).toBe(guide.canHelp);
      expect(screen.getByTestId('fox-guide-card-when-to-call').textContent).toBe(guide.whenToCall);
      unmount();
    }
  });

  it('every fox in registry has a matching guide entry', () => {
    const guideIds = new Set(GUIDES.map((g) => g.id));
    for (const fox of FOXES) {
      expect(guideIds.has(fox.id)).toBe(true);
    }
  });

  it('border color matches fox.glow', () => {
    render(
      <FoxGuideCard foxId="mo" anchorRect={makeRect()} onClose={() => {}} />,
    );
    const card = screen.getByTestId('fox-guide-card') as HTMLElement;
    // mo.glow = #3A4252 → jsdom renders as rgb(58, 66, 82)
    expect(card.style.borderColor).toMatch(/#3A4252|rgb\(58,\s*66,\s*82\)/i);
  });

  it('portal mounts to document.body and is removed on unmount', () => {
    const { unmount } = render(
      <FoxGuideCard foxId="shi" anchorRect={makeRect()} onClose={() => {}} />,
    );
    expect(document.body.querySelector('[data-testid="fox-guide-card"]')).not.toBeNull();
    unmount();
    expect(document.body.querySelector('[data-testid="fox-guide-card"]')).toBeNull();
  });

  it('flips to left side when right side would clip viewport', () => {
    // jsdom default window.innerWidth = 1024
    const anchor = makeRect({ left: 1000, right: 1022, top: 200 });
    render(
      <FoxGuideCard foxId="dian" anchorRect={anchor} onClose={() => {}} />,
    );
    const card = screen.getByTestId('fox-guide-card') as HTMLElement;
    // CARD_WIDTH=232, CARD_OFFSET=12 → right placement at 1034 would clip;
    // expect flipped: left = max(8, 1000 - 12 - 232) = 756
    expect(card.style.left).toBe('756px');
  });

  it('calls onClose after 150ms grace when mouse leaves the card', async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(
      <FoxGuideCard foxId="xin" anchorRect={makeRect()} onClose={onClose} />,
    );
    const card = screen.getByTestId('fox-guide-card');
    act(() => {
      fireEvent.mouseLeave(card);
    });
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
