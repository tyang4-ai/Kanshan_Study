import type { CorkboardPin } from '@/lib/store/corkboard';

// Auto-grid: when a pin has no explicit (x,y), assign a slot. Simple
// row-major scan, no collision math beyond grid alignment. User drag
// overrides via movePin() with explicit coords.

const GRID_PAD_X = 12;
const GRID_PAD_Y = 12;
const GRID_GAP = 14;

export function withGridPositions(
  pins: CorkboardPin[],
  containerWidth: number,
): Array<CorkboardPin & { x: number; y: number }> {
  const result: Array<CorkboardPin & { x: number; y: number }> = [];
  let cursorX = GRID_PAD_X;
  let cursorY = GRID_PAD_Y;
  let rowMaxH = 0;

  for (const pin of pins) {
    if (typeof pin.x === 'number' && typeof pin.y === 'number') {
      result.push({ ...pin, x: pin.x, y: pin.y });
      continue;
    }
    // Wrap if no horizontal room
    if (cursorX + pin.w > containerWidth - GRID_PAD_X) {
      cursorX = GRID_PAD_X;
      cursorY += rowMaxH + GRID_GAP;
      rowMaxH = 0;
    }
    result.push({ ...pin, x: cursorX, y: cursorY });
    cursorX += pin.w + GRID_GAP;
    rowMaxH = Math.max(rowMaxH, pin.h);
  }

  return result;
}

export function nextSlotForKanshan(
  existingPins: CorkboardPin[],
  containerWidth: number,
): { x: number; y: number } {
  // Computes the next grid slot after all explicitly-positioned pins.
  // Used when 看山 dispatches results and wants a sensible default position.
  const positioned = withGridPositions(existingPins, containerWidth);
  if (positioned.length === 0) return { x: GRID_PAD_X, y: GRID_PAD_Y };
  const last = positioned[positioned.length - 1];
  return { x: last.x + last.w + GRID_GAP, y: last.y };
}
