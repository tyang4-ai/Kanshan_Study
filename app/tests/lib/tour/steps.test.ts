import { describe, it, expect } from 'vitest';
import { TOUR_STEPS } from '@/lib/tour/steps';

describe('TOUR_STEPS', () => {
  it('has exactly 5 action-led steps (trimmed from 8 per persona-review 2026-05-10)', () => {
    expect(TOUR_STEPS.length).toBe(5);
  });

  it('all step ids are unique', () => {
    const ids = TOUR_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('first step introduces the 9-fox cast (Y8-P1c, 2026-05-11)', () => {
    // Casual review (Sun Yulin) flagged that the prior "选一段文字 · 让看墨重写"
    // mentioned 看墨 before any fox had been introduced. Tour now leads with
    // the roster, then dives into the action.
    expect(TOUR_STEPS[0].id).toBe('fox-tails');
  });

  it('editor step still exists as the second card', () => {
    expect(TOUR_STEPS[1].id).toBe('editor');
  });

  it('final step is envelope (lore portal teaser)', () => {
    expect(TOUR_STEPS[TOUR_STEPS.length - 1].id).toBe('envelope');
  });

  it('includes profile-chip step (new target for persona-switch demo)', () => {
    expect(TOUR_STEPS.some((s) => s.id === 'profile-chip')).toBe(true);
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
