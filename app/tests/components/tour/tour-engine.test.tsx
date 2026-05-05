import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { TourEngine } from '@/components/tour/TourEngine';
import { TOUR_STEPS } from '@/lib/tour/steps';

function mountAnchor(selectorAttr: string) {
  // selectorAttr is like 'left-rail' (the data-tour-id value)
  const el = document.createElement('div');
  el.setAttribute('data-tour-id', selectorAttr);
  // Stub bounding rect for jsdom.
  el.getBoundingClientRect = () =>
    ({ top: 100, left: 200, width: 300, height: 80, right: 500, bottom: 180, x: 200, y: 100, toJSON() {} }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

describe('TourEngine', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.localStorage.clear();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    window.localStorage.clear();
  });

  it('renders backdrop + card on mount when first step element exists', () => {
    mountAnchor('left-rail');
    const { getByTestId } = render(<TourEngine onComplete={() => {}} />);
    expect(getByTestId('tour-overlay')).toBeTruthy();
    expect(getByTestId('tour-card')).toBeTruthy();
  });

  it('shows step 1/8 indicator', () => {
    mountAnchor('left-rail');
    const { getByTestId } = render(<TourEngine onComplete={() => {}} />);
    expect(getByTestId('tour-card').textContent).toContain(`STEP 1/${TOUR_STEPS.length}`);
  });

  it('next button advances idx', () => {
    mountAnchor('left-rail');
    mountAnchor('editor');
    const { getByTestId } = render(<TourEngine onComplete={() => {}} />);
    expect(getByTestId('tour-card').getAttribute('data-step-idx')).toBe('0');
    fireEvent.click(getByTestId('tour-next'));
    expect(getByTestId('tour-card').getAttribute('data-step-idx')).toBe('1');
  });

  it('skip writes kanshan-tour-done and calls onComplete', () => {
    mountAnchor('left-rail');
    const onComplete = vi.fn();
    const { getByTestId } = render(<TourEngine onComplete={onComplete} />);
    fireEvent.click(getByTestId('tour-skip'));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem('kanshan-tour-done')).not.toBeNull();
  });

  it('after last step, next calls onComplete and writes kanshan-tour-done', () => {
    // Mount only the last step's anchor so the engine starts on it.
    mountAnchor('lore-envelope');
    const onComplete = vi.fn();
    const lastIdx = TOUR_STEPS.length - 1;
    const { getByTestId } = render(<TourEngine onComplete={onComplete} initialStep={lastIdx} />);
    expect(getByTestId('tour-card').getAttribute('data-step-idx')).toBe(String(lastIdx));
    fireEvent.click(getByTestId('tour-next'));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem('kanshan-tour-done')).not.toBeNull();
  });

  it('tolerates missing refs: skips invalid steps', () => {
    // Only mount editor (index 1). Engine should auto-advance from idx 0.
    mountAnchor('editor');
    const { getByTestId } = render(<TourEngine onComplete={() => {}} />);
    expect(getByTestId('tour-card').getAttribute('data-step-idx')).toBe('1');
  });

  it('renders dim backdrop at 0.3 when no anchor exists (centered fallback)', () => {
    // No anchors mounted → centered card rendered with full backdrop.
    const { getByTestId } = render(<TourEngine onComplete={() => {}} />);
    expect(getByTestId('tour-card')).toBeTruthy();
    const backdrop = getByTestId('tour-backdrop');
    expect(backdrop.getAttribute('style') ?? '').toContain('rgba(20, 22, 30, 0.3)');
  });

  it('uses 0.3 dim cutout when anchor exists', async () => {
    mountAnchor('left-rail');
    const { findByTestId } = render(<TourEngine onComplete={() => {}} />);
    // rect is set inside requestAnimationFrame, so wait for it.
    const cutout = await findByTestId('tour-cutout-0');
    expect(cutout.getAttribute('style') ?? '').toContain('rgba(20, 22, 30, 0.3)');
  });

  it('appears with cubic-bezier transition on the card', () => {
    mountAnchor('left-rail');
    const { getByTestId } = render(<TourEngine onComplete={() => {}} />);
    const card = getByTestId('tour-card');
    const style = card.getAttribute('style') ?? '';
    expect(style).toContain('cubic-bezier(.16,.84,.24,1)');
    expect(style).toContain('280ms');
  });

  it('renders per-step data-testid', () => {
    mountAnchor('left-rail');
    const { getByTestId } = render(<TourEngine onComplete={() => {}} />);
    expect(getByTestId('tour-step-left-rail')).toBeTruthy();
  });

  it('reflows on resize', () => {
    const el = mountAnchor('left-rail');
    const { getByTestId } = render(<TourEngine onComplete={() => {}} />);
    expect(getByTestId('tour-card')).toBeTruthy();
    el.getBoundingClientRect = () =>
      ({ top: 50, left: 50, width: 100, height: 50, right: 150, bottom: 100, x: 50, y: 50, toJSON() {} }) as DOMRect;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(getByTestId('tour-card')).toBeTruthy();
  });
});
