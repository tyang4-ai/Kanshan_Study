import { describe, it, expect } from 'vitest';
import { TOUR_STEPS } from '@/lib/tour/steps';

describe('TOUR_STEPS', () => {
  it('has exactly 8 steps', () => {
    expect(TOUR_STEPS.length).toBe(8);
  });

  it('all step ids are unique', () => {
    const ids = TOUR_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('final step id is lore-final', () => {
    expect(TOUR_STEPS[TOUR_STEPS.length - 1].id).toBe('lore-final');
  });

  it('all selectors are non-empty and start with [data-tour-id=', () => {
    for (const s of TOUR_STEPS) {
      expect(s.selector.length).toBeGreaterThan(0);
      expect(s.selector.startsWith('[data-tour-id=')).toBe(true);
    }
  });

  it('every step has title, body, side', () => {
    for (const s of TOUR_STEPS) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
      expect(['top', 'bottom', 'left', 'right']).toContain(s.side);
    }
  });
});
