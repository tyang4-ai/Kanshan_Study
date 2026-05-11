import { describe, it, expect, beforeEach } from 'vitest';
import { useCorkboardStore } from '@/lib/store/corkboard';

describe('useCorkboardStore', () => {
  beforeEach(() => {
    useCorkboardStore.getState().clear();
    localStorage.removeItem('kanshan-corkboard');
  });

  it('addPin returns unique id and persists', () => {
    const id1 = useCorkboardStore.getState().addPin({
      kind: 'vault', content: { title: 'a' }, createdBy: 'user', w: 180, h: 120,
    });
    const id2 = useCorkboardStore.getState().addPin({
      kind: 'vault', content: { title: 'b' }, createdBy: 'user', w: 180, h: 120,
    });
    expect(id1).not.toBe(id2);
    expect(useCorkboardStore.getState().pins.length).toBe(2);
  });

  it('addPostit creates a note kind', () => {
    const id = useCorkboardStore.getState().addPostit('hello');
    const pin = useCorkboardStore.getState().pins.find((p) => p.id === id);
    expect(pin?.kind).toBe('note');
    expect(pin?.content.annotation).toBe('hello');
  });

  it('removePin for missing id is no-op', () => {
    useCorkboardStore.getState().addPin({
      kind: 'vault', content: { title: 'a' }, createdBy: 'user', w: 180, h: 120,
    });
    const before = useCorkboardStore.getState().pins.length;
    useCorkboardStore.getState().removePin('does-not-exist');
    expect(useCorkboardStore.getState().pins.length).toBe(before);
  });

  it('movePin clamps to bounds', () => {
    const id = useCorkboardStore.getState().addPin({
      kind: 'vault', content: { title: 'a' }, createdBy: 'user', w: 180, h: 120,
    });
    useCorkboardStore.getState().movePin(id, 9999, 9999, { w: 320, h: 400 });
    const pin = useCorkboardStore.getState().pins.find((p) => p.id === id);
    expect(pin?.x).toBe(140); // 320 - 180
    expect(pin?.y).toBe(280); // 400 - 120
  });

  it('updateAnnotation replaces note text', () => {
    const id = useCorkboardStore.getState().addPostit('first');
    useCorkboardStore.getState().updateAnnotation(id, 'second');
    expect(useCorkboardStore.getState().pins[0].content.annotation).toBe('second');
  });

  it('persist writes to localStorage', () => {
    useCorkboardStore.getState().addPin({
      kind: 'note', content: { annotation: 'x' }, createdBy: 'kanshan', w: 160, h: 80,
    });
    const stored = localStorage.getItem('kanshan-corkboard');
    expect(stored).toBeTruthy();
    expect(stored).toContain('"annotation":"x"');
  });

  it('bringToFront moves the targeted pin to the end of the array', () => {
    const a = useCorkboardStore.getState().addPin({
      kind: 'vault', content: { title: 'a' }, createdBy: 'user', w: 180, h: 120,
    });
    const b = useCorkboardStore.getState().addPin({
      kind: 'vault', content: { title: 'b' }, createdBy: 'user', w: 180, h: 120,
    });
    const c = useCorkboardStore.getState().addPin({
      kind: 'note', content: { annotation: 'c' }, createdBy: 'user', w: 160, h: 80,
    });
    useCorkboardStore.getState().bringToFront(a);
    const ids = useCorkboardStore.getState().pins.map((p) => p.id);
    expect(ids).toEqual([b, c, a]);
  });

  it('bringToFront is a no-op when the id is missing', () => {
    useCorkboardStore.getState().addPin({
      kind: 'vault', content: { title: 'a' }, createdBy: 'user', w: 180, h: 120,
    });
    const before = useCorkboardStore.getState().pins.map((p) => p.id);
    useCorkboardStore.getState().bringToFront('does-not-exist');
    const after = useCorkboardStore.getState().pins.map((p) => p.id);
    expect(after).toEqual(before);
  });
});
