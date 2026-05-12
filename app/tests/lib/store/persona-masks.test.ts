import { describe, it, expect, beforeEach } from 'vitest';
import { usePersonaMasksStore } from '@/lib/store/persona-masks';
import type { CustomMask } from '@/lib/personas';

const makeMask = (id: string, label = id): CustomMask => ({
  id,
  label,
  description: `${label} description`,
  fox: 'wen2',
});

beforeEach(() => {
  window.localStorage.clear();
  usePersonaMasksStore.setState({ customMasks: [], hydratedFor: null });
});

describe('persona-masks store', () => {
  describe('hydrate', () => {
    it('seeds empty for a fresh account', () => {
      usePersonaMasksStore.getState().hydrate('me');
      expect(usePersonaMasksStore.getState().customMasks).toEqual([]);
      expect(usePersonaMasksStore.getState().hydratedFor).toBe('me');
    });

    it('restores from LS', () => {
      const m = makeMask('cm-1');
      window.localStorage.setItem('kanshan-custom-masks:me', JSON.stringify([m]));
      usePersonaMasksStore.getState().hydrate('me');
      expect(usePersonaMasksStore.getState().customMasks).toEqual([m]);
    });

    it('isolates accounts (me vs guwanxi do not bleed)', () => {
      const meMask = makeMask('me-mask');
      const guMask = makeMask('gu-mask');
      window.localStorage.setItem('kanshan-custom-masks:me', JSON.stringify([meMask]));
      window.localStorage.setItem('kanshan-custom-masks:guwanxi', JSON.stringify([guMask]));

      usePersonaMasksStore.getState().hydrate('me');
      expect(usePersonaMasksStore.getState().customMasks).toEqual([meMask]);

      usePersonaMasksStore.getState().hydrate('guwanxi');
      expect(usePersonaMasksStore.getState().customMasks).toEqual([guMask]);
    });

    it('is idempotent for the same account', () => {
      usePersonaMasksStore.getState().hydrate('me');
      usePersonaMasksStore.getState().addCustom(makeMask('x'));
      usePersonaMasksStore.getState().hydrate('me');
      expect(usePersonaMasksStore.getState().customMasks).toHaveLength(1);
    });

    it('migrates from legacy key once when no canonical key exists', () => {
      const legacy = makeMask('legacy-1');
      window.localStorage.setItem('kanshan-persona-custom:me', JSON.stringify([legacy]));
      usePersonaMasksStore.getState().hydrate('me');
      expect(usePersonaMasksStore.getState().customMasks).toEqual([legacy]);
      // Canonical key now mirrored; legacy left in place per non-destructive rule
      expect(window.localStorage.getItem('kanshan-custom-masks:me')).not.toBeNull();
      expect(window.localStorage.getItem('kanshan-persona-custom:me')).not.toBeNull();
    });

    it('migration is a no-op when no legacy key and no canonical key', () => {
      usePersonaMasksStore.getState().hydrate('me');
      expect(usePersonaMasksStore.getState().customMasks).toEqual([]);
    });
  });

  describe('addCustom', () => {
    it('appends to in-memory list', () => {
      usePersonaMasksStore.getState().hydrate('me');
      usePersonaMasksStore.getState().addCustom(makeMask('a'));
      usePersonaMasksStore.getState().addCustom(makeMask('b'));
      expect(usePersonaMasksStore.getState().customMasks.map((m) => m.id)).toEqual(['a', 'b']);
    });

    it('persists to LS under canonical key', () => {
      usePersonaMasksStore.getState().hydrate('me');
      usePersonaMasksStore.getState().addCustom(makeMask('a'));
      const raw = window.localStorage.getItem('kanshan-custom-masks:me');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw ?? '[]') as CustomMask[];
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('a');
    });
  });

  describe('removeCustom', () => {
    it('removes by id and persists', () => {
      usePersonaMasksStore.getState().hydrate('me');
      usePersonaMasksStore.getState().addCustom(makeMask('a'));
      usePersonaMasksStore.getState().addCustom(makeMask('b'));
      usePersonaMasksStore.getState().removeCustom('a');
      expect(usePersonaMasksStore.getState().customMasks.map((m) => m.id)).toEqual(['b']);
      const parsed = JSON.parse(
        window.localStorage.getItem('kanshan-custom-masks:me') ?? '[]',
      ) as CustomMask[];
      expect(parsed.map((m) => m.id)).toEqual(['b']);
    });
  });
});
