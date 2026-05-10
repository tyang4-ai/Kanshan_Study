import { describe, it, expect } from 'vitest';
import { withGridPositions, nextSlotForKanshan } from '@/lib/corkboard/layout';
import type { CorkboardPin } from '@/lib/store/corkboard';

const makePin = (i: number, overrides: Partial<CorkboardPin> = {}): CorkboardPin => ({
  id: `p-${i}`,
  kind: 'vault',
  w: 180,
  h: 120,
  content: { title: `Pin ${i}` },
  createdBy: 'user',
  createdAt: Date.now() + i,
  ...overrides,
});

describe('corkboard layout', () => {
  it('assigns grid positions to pins without explicit x/y', () => {
    const out = withGridPositions([makePin(1), makePin(2)], 400);
    expect(out[0].x).toBeGreaterThanOrEqual(0);
    expect(out[0].y).toBeGreaterThanOrEqual(0);
    expect(out[1].x).toBeGreaterThan(out[0].x);
  });

  it('preserves explicit positions', () => {
    const out = withGridPositions(
      [makePin(1, { x: 50, y: 60 }), makePin(2)],
      400,
    );
    expect(out[0].x).toBe(50);
    expect(out[0].y).toBe(60);
  });

  it('wraps to next row when container width exceeded', () => {
    // 400px container, 180px cards + 14 gap = 372 max for 2 cards in a row,
    // 3rd card must wrap.
    const out = withGridPositions([makePin(1), makePin(2), makePin(3)], 400);
    expect(out[2].y).toBeGreaterThan(out[0].y);
  });

  it('nextSlotForKanshan returns initial slot when empty', () => {
    const slot = nextSlotForKanshan([], 400);
    expect(slot.x).toBeGreaterThan(0);
    expect(slot.y).toBeGreaterThan(0);
  });

  it('nextSlotForKanshan returns slot after last pin', () => {
    const slot = nextSlotForKanshan([makePin(1)], 400);
    expect(slot.x).toBeGreaterThan(180);
  });
});
