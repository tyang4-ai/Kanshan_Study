import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorTabsStore } from '@/lib/store/editor-tabs';

const ACC = 'me';

beforeEach(() => {
  window.localStorage.clear();
  useEditorTabsStore.setState({ docs: {}, activeId: null, hydratedFor: null });
});

describe('editor-tabs store', () => {
  describe('hydrate', () => {
    it('seeds an initial doc when storage is empty', () => {
      useEditorTabsStore.getState().hydrate(ACC);
      const state = useEditorTabsStore.getState();
      expect(Object.keys(state.docs)).toHaveLength(1);
      expect(state.activeId).not.toBeNull();
      expect(state.hydratedFor).toBe(ACC);
    });

    it('is idempotent for the same account', () => {
      useEditorTabsStore.getState().hydrate(ACC);
      const firstId = useEditorTabsStore.getState().activeId;
      useEditorTabsStore.getState().hydrate(ACC);
      expect(useEditorTabsStore.getState().activeId).toBe(firstId);
    });

    it('reloads when account changes', () => {
      useEditorTabsStore.getState().hydrate('me');
      const firstId = useEditorTabsStore.getState().activeId;
      useEditorTabsStore.getState().hydrate('guwanxi');
      expect(useEditorTabsStore.getState().activeId).not.toBe(firstId);
      expect(useEditorTabsStore.getState().hydratedFor).toBe('guwanxi');
    });

    it('migrates legacy single-key when storage has only the old key', () => {
      window.localStorage.setItem(`kanshan-editor-doc:${ACC}`, '<p>legacy content</p>');
      useEditorTabsStore.getState().hydrate(ACC);
      const docs = Object.values(useEditorTabsStore.getState().docs);
      expect(docs).toHaveLength(1);
      expect(docs[0].htmlContent).toContain('legacy content');
      expect(window.localStorage.getItem(`kanshan-editor-doc:${ACC}`)).toBeNull();
    });

    it('skips legacy migration when legacy is whitespace-only', () => {
      window.localStorage.setItem(`kanshan-editor-doc:${ACC}`, '<p>   </p>');
      useEditorTabsStore.getState().hydrate(ACC);
      // Empty legacy → falls through to seedInitial which uses DEFAULT_DOC_HTML.
      const docs = Object.values(useEditorTabsStore.getState().docs);
      expect(docs).toHaveLength(1);
      expect(docs[0].htmlContent).not.toBe('<p>   </p>');
    });
  });

  describe('addTab', () => {
    it('returns id, persists to LS, and switches active to it', () => {
      useEditorTabsStore.getState().hydrate(ACC);
      const id = useEditorTabsStore.getState().addTab('x.md', '<p>hi</p>', 'local');
      const state = useEditorTabsStore.getState();
      expect(state.docs[id]).toBeDefined();
      expect(state.activeId).toBe(id);
      expect(state.docs[id].htmlContent).toBe('<p>hi</p>');
      const persisted = window.localStorage.getItem(`kanshan-tabs:${ACC}`);
      expect(persisted).not.toBeNull();
      expect(persisted).toContain('x.md');
    });

    it('accepts source = "vault" and stores vaultArticleId from opts', () => {
      useEditorTabsStore.getState().hydrate(ACC);
      const id = useEditorTabsStore
        .getState()
        .addTab('archived.md', '<p>body</p>', 'vault', { vaultArticleId: 'art-42' });
      const doc = useEditorTabsStore.getState().docs[id];
      expect(doc.source).toBe('vault');
      expect(doc.vaultArticleId).toBe('art-42');
      // Persists through LS round-trip.
      const persisted = JSON.parse(
        window.localStorage.getItem(`kanshan-tabs:${ACC}`) ?? '{}',
      );
      expect(persisted.docs[id].source).toBe('vault');
      expect(persisted.docs[id].vaultArticleId).toBe('art-42');
    });

    it('omits vaultArticleId when opts is missing (no key on the doc)', () => {
      useEditorTabsStore.getState().hydrate(ACC);
      const id = useEditorTabsStore.getState().addTab('plain.md', '<p>hi</p>', 'vault');
      const doc = useEditorTabsStore.getState().docs[id];
      expect(doc.source).toBe('vault');
      expect(doc.vaultArticleId).toBeUndefined();
    });
  });

  describe('closeTab', () => {
    it('removes the tab and picks a new active', () => {
      useEditorTabsStore.getState().hydrate(ACC);
      const id1 = useEditorTabsStore.getState().activeId!;
      const id2 = useEditorTabsStore.getState().addTab('b.md');
      useEditorTabsStore.getState().closeTab(id2);
      const s = useEditorTabsStore.getState();
      expect(s.docs[id2]).toBeUndefined();
      expect(s.activeId).toBe(id1);
    });

    it('closing the last tab seeds a fresh blank tab', () => {
      useEditorTabsStore.getState().hydrate(ACC);
      const id = useEditorTabsStore.getState().activeId!;
      useEditorTabsStore.getState().closeTab(id);
      const s = useEditorTabsStore.getState();
      expect(Object.values(s.docs)).toHaveLength(1);
      expect(s.activeId).not.toBe(id);
      const fresh = Object.values(s.docs)[0];
      expect(fresh.filename).toBe('untitled-1.md');
    });
  });

  describe('switchTo', () => {
    it('changes activeId when target exists', () => {
      useEditorTabsStore.getState().hydrate(ACC);
      useEditorTabsStore.getState().addTab('b.md');
      const prev = useEditorTabsStore.getState().activeId!;
      useEditorTabsStore.getState().switchTo(prev);
      expect(useEditorTabsStore.getState().activeId).toBe(prev);
    });

    it('no-ops when target does not exist', () => {
      useEditorTabsStore.getState().hydrate(ACC);
      const before = useEditorTabsStore.getState().activeId;
      useEditorTabsStore.getState().switchTo('nonexistent');
      expect(useEditorTabsStore.getState().activeId).toBe(before);
    });
  });

  describe('setContent + persistence', () => {
    it('updates content, stamps lastSavedAt, and writes through to LS', () => {
      useEditorTabsStore.getState().hydrate(ACC);
      const id = useEditorTabsStore.getState().activeId!;
      const t0 = useEditorTabsStore.getState().docs[id].lastSavedAt;
      // small delay to ensure timestamp moves forward
      const before = Date.now();
      useEditorTabsStore.getState().setContent(id, '<p>new</p>');
      const after = useEditorTabsStore.getState().docs[id];
      expect(after.htmlContent).toBe('<p>new</p>');
      expect(after.lastSavedAt).toBeGreaterThanOrEqual(before);
      expect(after.lastSavedAt).toBeGreaterThanOrEqual(t0);
      const persisted = JSON.parse(
        window.localStorage.getItem(`kanshan-tabs:${ACC}`) ?? '{}',
      );
      expect(persisted.docs[id].htmlContent).toBe('<p>new</p>');
    });

    it('is a no-op when content is unchanged', () => {
      useEditorTabsStore.getState().hydrate(ACC);
      const id = useEditorTabsStore.getState().activeId!;
      const t0 = useEditorTabsStore.getState().docs[id].lastSavedAt;
      const html = useEditorTabsStore.getState().docs[id].htmlContent;
      useEditorTabsStore.getState().setContent(id, html);
      expect(useEditorTabsStore.getState().docs[id].lastSavedAt).toBe(t0);
    });
  });

  describe('rename / renameActive', () => {
    it('renameActive updates the active doc filename', () => {
      useEditorTabsStore.getState().hydrate(ACC);
      useEditorTabsStore.getState().renameActive('new-name.md');
      const id = useEditorTabsStore.getState().activeId!;
      expect(useEditorTabsStore.getState().docs[id].filename).toBe('new-name.md');
    });
  });

  describe('dirty flag', () => {
    it('setDirty toggles without touching lastSavedAt', () => {
      useEditorTabsStore.getState().hydrate(ACC);
      const id = useEditorTabsStore.getState().activeId!;
      const t0 = useEditorTabsStore.getState().docs[id].lastSavedAt;
      useEditorTabsStore.getState().setDirty(id, true);
      expect(useEditorTabsStore.getState().docs[id].dirty).toBe(true);
      expect(useEditorTabsStore.getState().docs[id].lastSavedAt).toBe(t0);
    });
  });
});
