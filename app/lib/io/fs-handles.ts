'use client';

// Thin wrapper over the File System Access API. Chromium-first (Chrome / Edge
// / Vivaldi / Brave from 2024+). Firefox + Safari don't ship showDirectoryPicker
// yet — we gate via supportsFSA() and let callers degrade to localStorage-only.

import { putHandle, getHandle, deleteHandle } from './fs-idb';

const SUPPORTED_EXTS = ['.md', '.markdown', '.txt'] as const;
type SupportedExt = (typeof SUPPORTED_EXTS)[number];

export interface DiskFile {
  name: string;
  handle: FileSystemFileHandle;
}

export function supportsFSA(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function pickFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!supportsFSA()) return null;
  try {
    const w = window as unknown as {
      showDirectoryPicker: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
    };
    const handle = await w.showDirectoryPicker({ mode: 'readwrite' });
    return handle;
  } catch (err) {
    // User cancelled, or permission denied.
    if (err instanceof Error && /AbortError|cancell?ed/i.test(err.name + err.message)) {
      return null;
    }
    throw err;
  }
}

function hasSupportedExt(name: string): SupportedExt | null {
  const lower = name.toLowerCase();
  for (const ext of SUPPORTED_EXTS) {
    if (lower.endsWith(ext)) return ext;
  }
  return null;
}

export async function listFolderFiles(
  handle: FileSystemDirectoryHandle,
): Promise<DiskFile[]> {
  const out: DiskFile[] = [];
  // FSA spec exposes the directory as async iterable of [name, handle].
  // TS lib.dom may not type this yet, so cast.
  const entries = (handle as unknown as {
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  }).entries();
  for await (const [name, child] of entries) {
    if (child.kind !== 'file') continue;
    if (!hasSupportedExt(name)) continue;
    out.push({ name, handle: child as FileSystemFileHandle });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export async function readFile(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

export async function writeFile(
  dirHandle: FileSystemDirectoryHandle,
  name: string,
  content: string,
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(name, { create: true });
  // createWritable is on FileSystemFileHandle; cast for tighter typing.
  const writable = await (fileHandle as unknown as {
    createWritable(): Promise<FileSystemWritableFileStream>;
  }).createWritable();
  await writable.write(content);
  await writable.close();
}

export async function ensurePermission(
  handle: FileSystemDirectoryHandle,
): Promise<'granted' | 'prompt' | 'denied'> {
  const h = handle as unknown as {
    queryPermission(opts: { mode: 'readwrite' }): Promise<PermissionState>;
    requestPermission(opts: { mode: 'readwrite' }): Promise<PermissionState>;
  };
  const current = await h.queryPermission({ mode: 'readwrite' });
  if (current === 'granted') return 'granted';
  // Only request inside a user gesture; callers should call this from a click handler.
  const next = await h.requestPermission({ mode: 'readwrite' });
  return next as 'granted' | 'prompt' | 'denied';
}

export async function persistHandle(
  accountId: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  await putHandle(accountId, handle);
}

export async function restoreHandle(
  accountId: string,
): Promise<FileSystemDirectoryHandle | null> {
  if (!supportsFSA()) return null;
  try {
    return await getHandle(accountId);
  } catch {
    return null;
  }
}

export async function forgetHandle(accountId: string): Promise<void> {
  try {
    await deleteHandle(accountId);
  } catch {
    // best-effort
  }
}
