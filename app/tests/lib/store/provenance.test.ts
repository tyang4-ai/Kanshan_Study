import { describe, it, expect, beforeEach } from 'vitest';
import {
  useProvenanceStore,
  getProvenance,
  findProvenanceForChit,
} from '@/lib/store/provenance';

describe('useProvenanceStore', () => {
  beforeEach(() => {
    useProvenanceStore.setState({ entries: [] });
  });

  it('starts empty', () => {
    expect(useProvenanceStore.getState().entries).toEqual([]);
  });

  it('add appends entry with unique id and timestamp', () => {
    const { add } = useProvenanceStore.getState();
    add({ kind: 'ai-touched', excerpt: 'first', fox: 'mo' });
    add({ kind: 'hedge', excerpt: 'second', fox: 'xin' });
    const entries = useProvenanceStore.getState().entries;
    expect(entries).toHaveLength(2);
    expect(entries[0].id).not.toBe(entries[1].id);
    expect(entries[0].at).toBeLessThanOrEqual(entries[1].at);
    expect(entries[0].kind).toBe('ai-touched');
    expect(entries[1].kind).toBe('hedge');
  });

  it('remove deletes by id', () => {
    const { add, remove } = useProvenanceStore.getState();
    add({ kind: 'claim', excerpt: 'x', fox: 'xin' });
    const id = useProvenanceStore.getState().entries[0].id;
    remove(id);
    expect(useProvenanceStore.getState().entries).toHaveLength(0);
  });

  it('clear empties all entries', () => {
    const { add, clear } = useProvenanceStore.getState();
    add({ kind: 'sourced', excerpt: 'a', fox: 'shui' });
    add({ kind: 'sourced', excerpt: 'b', fox: 'shui' });
    clear();
    expect(useProvenanceStore.getState().entries).toEqual([]);
  });

  it('preserves entry order on multiple add of same kind', () => {
    const { add } = useProvenanceStore.getState();
    add({ kind: 'hedge', excerpt: 'one', fox: 'xin' });
    add({ kind: 'hedge', excerpt: 'two', fox: 'xin' });
    add({ kind: 'hedge', excerpt: 'three', fox: 'xin' });
    const entries = useProvenanceStore.getState().entries;
    expect(entries.map((e) => e.excerpt)).toEqual(['one', 'two', 'three']);
  });

  describe('getProvenance', () => {
    it('returns the entry by id', () => {
      const { add } = useProvenanceStore.getState();
      add({ kind: 'hedge', excerpt: 'A', fox: 'xin' });
      const id = useProvenanceStore.getState().entries[0].id;
      expect(getProvenance(id)?.excerpt).toBe('A');
    });
    it('returns null for an unknown id', () => {
      expect(getProvenance('does-not-exist')).toBeNull();
    });
  });

  describe('findProvenanceForChit', () => {
    it('maps reviewed → hedge by exact excerpt', () => {
      const { add } = useProvenanceStore.getState();
      add({ kind: 'hedge', excerpt: '此药对癌症有效', fox: 'xin' });
      const found = findProvenanceForChit('reviewed', '此药对癌症有效');
      expect(found?.kind).toBe('hedge');
      expect(found?.excerpt).toBe('此药对癌症有效');
    });
    it('maps flag → flagged by substring containment', () => {
      const { add } = useProvenanceStore.getState();
      add({ kind: 'flagged', excerpt: '神药包治百病', fox: 'xin' });
      const found = findProvenanceForChit('flag', '神药');
      expect(found?.kind).toBe('flagged');
    });
    it('maps sourced → sourced; falls back to most recent when nothing matches', () => {
      const { add } = useProvenanceStore.getState();
      add({ kind: 'sourced', excerpt: 'X', fox: 'shui' });
      add({ kind: 'sourced', excerpt: 'Y', fox: 'shui' });
      const found = findProvenanceForChit('sourced', 'unrelated');
      expect(found?.excerpt).toBe('Y');
    });
    it('returns null when no entries of the mapped kind exist', () => {
      expect(findProvenanceForChit('flag', 'any')).toBeNull();
    });
  });
});
