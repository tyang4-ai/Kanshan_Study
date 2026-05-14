'use client';
import { create } from 'zustand';
import { DEFAULT_DOC_HTML } from '@/content/seed/default-document.html';

/**
 * One open document. Tabs are first-class — every visible tab is exactly
 * one DocEntry, and the editor mounts whichever one is active.
 */
export interface DocEntry {
  id: string;
  filename: string;
  htmlContent: string;
  /** epoch ms — last time the content was persisted (to localStorage / disk) */
  lastSavedAt: number;
  /** true between an edit and the next save flush */
  dirty: boolean;
  /** 'local' = lives in localStorage only · 'disk' = mirrored to a FSA folder ·
   *  'vault' = opened from a 看典 archived article (round-trips to vault on save) */
  source: 'local' | 'disk' | 'vault';
  /** When source === 'vault', the originating articles.id from the vault DB.
   *  Used to detect "already open" so re-展卷 switches instead of duplicating. */
  vaultArticleId?: string;
}

interface EditorTabsState {
  docs: Record<string, DocEntry>;
  activeId: string | null;
  hydratedFor: string | null; // accountId we last hydrated for

  /** Load docs for this account from localStorage (with one-time migration
   *  from the legacy single-document key). Idempotent per account. */
  hydrate: (accountId: string) => void;

  /** Create a new doc and switch to it. Returns its id. */
  addTab: (
    filename: string,
    html?: string,
    source?: 'local' | 'disk' | 'vault',
    opts?: { vaultArticleId?: string },
  ) => string;

  /** Close a tab. If it was active, switch to the next-most-recent tab. */
  closeTab: (id: string) => void;

  /** Make a tab active without changing its content. */
  switchTo: (id: string) => void;

  /** Rename the currently active doc. */
  renameActive: (filename: string) => void;

  /** Rename any doc by id. */
  rename: (id: string, filename: string) => void;

  /** Update doc HTML content + mark saved-now. Caller is responsible for
   *  triggering persistHandle for disk-sync; this only handles in-memory + LS. */
  setContent: (id: string, html: string) => void;

  /** Stamp lastSavedAt without changing content (used by disk-write). */
  markSaved: (id: string, ts?: number) => void;

  /** Mark doc dirty/clean (used by ×-close prompt). */
  setDirty: (id: string, dirty: boolean) => void;
}

const LEGACY_DOC_KEY = (acc: string) => `kanshan-editor-doc:${acc}`;
const TABS_KEY = (acc: string) => `kanshan-tabs:${acc}`;

interface PersistShape {
  docs: Record<string, DocEntry>;
  activeId: string | null;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function loadFromStorage(accountId: string): PersistShape | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(TABS_KEY(accountId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistShape;
    if (!parsed || typeof parsed !== 'object' || !parsed.docs) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(accountId: string, shape: PersistShape): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(TABS_KEY(accountId), JSON.stringify(shape));
  } catch {
    // quota — ignored, kept in-memory
  }
}

function makeId(): string {
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function migrateLegacy(accountId: string): PersistShape | null {
  if (!isBrowser()) return null;
  const legacy = window.localStorage.getItem(LEGACY_DOC_KEY(accountId));
  if (!legacy) return null;
  const trimmed = legacy.trim();
  const stripped = trimmed.replace(/<[^>]+>/g, '').replace(/\s+/g, '');
  if (stripped.length === 0) {
    // legacy was empty — nothing useful to migrate
    window.localStorage.removeItem(LEGACY_DOC_KEY(accountId));
    return null;
  }
  const id = makeId();
  const doc: DocEntry = {
    id,
    filename: '胶质母细胞瘤 · 家属该了解的.md',
    htmlContent: legacy,
    lastSavedAt: Date.now(),
    dirty: false,
    source: 'local',
  };
  const shape: PersistShape = { docs: { [id]: doc }, activeId: id };
  window.localStorage.setItem(TABS_KEY(accountId), JSON.stringify(shape));
  window.localStorage.removeItem(LEGACY_DOC_KEY(accountId));
  return shape;
}

function seedInitial(): PersistShape {
  const id = makeId();
  return {
    docs: {
      [id]: {
        id,
        filename: '胶质母细胞瘤 · 家属该了解的.md',
        htmlContent: DEFAULT_DOC_HTML,
        lastSavedAt: Date.now(),
        dirty: false,
        source: 'local',
      },
    },
    activeId: id,
  };
}

export const useEditorTabsStore = create<EditorTabsState>((set, get) => ({
  docs: {},
  activeId: null,
  hydratedFor: null,

  hydrate(accountId) {
    // Idempotent: same account → no-op. Different account → reload.
    if (get().hydratedFor === accountId) return;
    const fromStorage = loadFromStorage(accountId) ?? migrateLegacy(accountId) ?? seedInitial();
    // 2026-05-13 demo-pivot cleanup: stale 影像组学 filenames from earlier
    // iterations get renamed to the new GBM walkthrough title on hydrate so
    // returning judges never see the old tab strip text.
    const STALE_FILENAME_RE = /影像组学|untitled-1\.md|^test\.md$|影像组学与基因组学/i;
    const NEW_FILENAME = '胶质母细胞瘤 · 家属该了解的.md';
    let renamed = false;
    for (const id of Object.keys(fromStorage.docs)) {
      const d = fromStorage.docs[id];
      if (STALE_FILENAME_RE.test(d.filename)) {
        fromStorage.docs[id] = { ...d, filename: NEW_FILENAME };
        renamed = true;
      }
    }
    // If storage had no activeId, pick the most recently saved.
    let activeId = fromStorage.activeId;
    if (!activeId || !fromStorage.docs[activeId]) {
      const sorted = Object.values(fromStorage.docs).sort((a, b) => b.lastSavedAt - a.lastSavedAt);
      activeId = sorted[0]?.id ?? null;
    }
    set({ docs: fromStorage.docs, activeId, hydratedFor: accountId });
    if (isBrowser() && (fromStorage.activeId !== activeId || renamed)) {
      saveToStorage(accountId, { docs: fromStorage.docs, activeId });
    }
  },

  addTab(filename, html, source = 'local', opts) {
    const id = makeId();
    const doc: DocEntry = {
      id,
      filename,
      htmlContent: html ?? '<p></p>',
      lastSavedAt: Date.now(),
      dirty: false,
      source,
      ...(opts?.vaultArticleId !== undefined ? { vaultArticleId: opts.vaultArticleId } : {}),
    };
    set((state) => {
      const docs = { ...state.docs, [id]: doc };
      const next = { docs, activeId: id };
      if (state.hydratedFor) saveToStorage(state.hydratedFor, next);
      return next;
    });
    return id;
  },

  closeTab(id) {
    set((state) => {
      if (!(id in state.docs)) return state;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...rest } = state.docs;
      let nextActive = state.activeId;
      if (state.activeId === id) {
        const remaining = Object.values(rest).sort((a, b) => b.lastSavedAt - a.lastSavedAt);
        nextActive = remaining[0]?.id ?? null;
        // If we just closed the last tab, seed a fresh blank one so the
        // editor never mounts against null.
        if (!nextActive) {
          const fresh: DocEntry = {
            id: makeId(),
            filename: 'untitled-1.md',
            htmlContent: '<p></p>',
            lastSavedAt: Date.now(),
            dirty: false,
            source: 'local',
          };
          const next = { docs: { [fresh.id]: fresh }, activeId: fresh.id };
          if (state.hydratedFor) saveToStorage(state.hydratedFor, next);
          return next;
        }
      }
      const next = { docs: rest, activeId: nextActive };
      if (state.hydratedFor) saveToStorage(state.hydratedFor, next);
      return next;
    });
  },

  switchTo(id) {
    set((state) => {
      if (!(id in state.docs) || state.activeId === id) return state;
      if (state.hydratedFor) saveToStorage(state.hydratedFor, { docs: state.docs, activeId: id });
      return { activeId: id };
    });
  },

  renameActive(filename) {
    const id = get().activeId;
    if (!id) return;
    get().rename(id, filename);
  },

  rename(id, filename) {
    set((state) => {
      const doc = state.docs[id];
      if (!doc) return state;
      const docs = { ...state.docs, [id]: { ...doc, filename, lastSavedAt: Date.now() } };
      if (state.hydratedFor) saveToStorage(state.hydratedFor, { docs, activeId: state.activeId });
      return { docs };
    });
  },

  setContent(id, html) {
    set((state) => {
      const doc = state.docs[id];
      if (!doc || doc.htmlContent === html) return state;
      const docs = {
        ...state.docs,
        [id]: { ...doc, htmlContent: html, lastSavedAt: Date.now(), dirty: false },
      };
      if (state.hydratedFor) saveToStorage(state.hydratedFor, { docs, activeId: state.activeId });
      return { docs };
    });
  },

  markSaved(id, ts) {
    set((state) => {
      const doc = state.docs[id];
      if (!doc) return state;
      const docs = {
        ...state.docs,
        [id]: { ...doc, lastSavedAt: ts ?? Date.now(), dirty: false },
      };
      if (state.hydratedFor) saveToStorage(state.hydratedFor, { docs, activeId: state.activeId });
      return { docs };
    });
  },

  setDirty(id, dirty) {
    set((state) => {
      const doc = state.docs[id];
      if (!doc || doc.dirty === dirty) return state;
      const docs = { ...state.docs, [id]: { ...doc, dirty } };
      // Dirty flag doesn't need persistence (it resets on reload anyway).
      return { docs };
    });
  },
}));

// Convenience selectors — keep call sites terse.
export const selectActiveDoc = (s: EditorTabsState): DocEntry | null =>
  s.activeId ? s.docs[s.activeId] ?? null : null;

export const selectTabsList = (s: EditorTabsState): DocEntry[] =>
  Object.values(s.docs).sort((a, b) => {
    // Stable order: keep insertion-ish by id (which embeds timestamp).
    return a.id.localeCompare(b.id);
  });
