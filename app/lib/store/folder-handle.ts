'use client';
import { create } from 'zustand';
import {
  pickFolder,
  listFolderFiles,
  readFile,
  writeFile,
  persistHandle,
  restoreHandle,
  forgetHandle,
  ensurePermission,
  supportsFSA,
} from '@/lib/io/fs-handles';
import { useEditorTabsStore } from '@/lib/store/editor-tabs';

type Permission = 'granted' | 'prompt' | 'denied' | null;

interface FolderHandleState {
  handle: FileSystemDirectoryHandle | null;
  permission: Permission;
  folderName: string | null;
  /** Maps doc id → file handle so save-back doesn't have to re-list the folder. */
  fileHandles: Record<string, FileSystemFileHandle>;

  /** Try to load a previously-bound handle from IDB. Safe no-op on FF/Safari. */
  restore: (accountId: string) => Promise<void>;

  /** Prompt the user to pick a folder, load its .md/.txt files as tabs. */
  bind: (accountId: string) => Promise<{ ok: boolean; loaded: number; message?: string }>;

  /** Forget the current handle (keep tabs as `source: 'local'`). */
  unbind: (accountId: string) => Promise<void>;

  /** Write the doc back to the bound folder. Throws if no handle. */
  pushDoc: (docId: string, filename: string, content: string) => Promise<void>;
}

export const useFolderHandleStore = create<FolderHandleState>((set, get) => ({
  handle: null,
  permission: null,
  folderName: null,
  fileHandles: {},

  async restore(accountId) {
    if (!supportsFSA()) return;
    const handle = await restoreHandle(accountId);
    if (!handle) return;
    try {
      const perm = await ensurePermission(handle);
      set({
        handle,
        permission: perm,
        folderName: (handle as unknown as { name?: string }).name ?? null,
      });
    } catch {
      // permission denied or revoked — forget it
      await forgetHandle(accountId);
    }
  },

  async bind(accountId) {
    if (!supportsFSA()) {
      return { ok: false, loaded: 0, message: '此浏览器暂不支持本地文件夹同步' };
    }
    const handle = await pickFolder();
    if (!handle) return { ok: false, loaded: 0, message: '已取消' };
    const perm = await ensurePermission(handle);
    if (perm !== 'granted') {
      return { ok: false, loaded: 0, message: '未授予读写权限' };
    }
    const files = await listFolderFiles(handle);
    const fileHandles: Record<string, FileSystemFileHandle> = {};
    let firstId: string | null = null;
    for (const f of files) {
      const text = await readFile(f.handle);
      // Wrap content in <p> tags if it looks like plain text/markdown — the
      // import path through marked is already in FileMenuButtons; keep this
      // path minimal and pass markdown source through unchanged so TipTap's
      // tiptap-markdown extension renders it on first paint.
      const html = wrapAsHtml(text, f.name);
      const id = useEditorTabsStore.getState().addTab(f.name, html, 'disk');
      fileHandles[id] = f.handle;
      if (!firstId) firstId = id;
    }
    await persistHandle(accountId, handle);
    set({
      handle,
      permission: 'granted',
      folderName: (handle as unknown as { name?: string }).name ?? null,
      fileHandles,
    });
    if (firstId) useEditorTabsStore.getState().switchTo(firstId);
    return { ok: true, loaded: files.length };
  },

  async unbind(accountId) {
    await forgetHandle(accountId);
    set({ handle: null, permission: null, folderName: null, fileHandles: {} });
  },

  async pushDoc(docId, filename, content) {
    const { handle, fileHandles } = get();
    if (!handle) throw new Error('no folder bound');
    // If we know a specific file handle for this docId, reuse it (preserves
    // any external rename). Else write a new file at filename.
    const known = fileHandles[docId];
    if (known) {
      const writable = await (known as unknown as {
        createWritable(): Promise<FileSystemWritableFileStream>;
      }).createWritable();
      await writable.write(content);
      await writable.close();
      return;
    }
    await writeFile(handle, filename, content);
    // Track newly-written file so future saves use its handle directly.
    try {
      const newHandle = await handle.getFileHandle(filename, { create: false });
      set((s) => ({ fileHandles: { ...s.fileHandles, [docId]: newHandle } }));
    } catch {
      // race / external delete — next save will recreate
    }
  },
}));

function wrapAsHtml(text: string, filename: string): string {
  const ext = filename.toLowerCase();
  if (ext.endsWith('.md') || ext.endsWith('.markdown')) {
    // Leave markdown source as-is; tiptap-markdown will parse it on insert.
    // We wrap in a <p> for paragraph-default fallback if the user types
    // before any markdown rendering happens.
    return text
      .split(/\n{2,}/)
      .map((para) => `<p>${escapeHtml(para.trim())}</p>`)
      .join('');
  }
  // .txt fallback: one <p> per line.
  return text
    .split(/\n/)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
