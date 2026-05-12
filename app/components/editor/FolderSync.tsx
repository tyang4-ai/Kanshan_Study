'use client';

import { useEffect, useRef } from 'react';
import { useEditorTabsStore } from '@/lib/store/editor-tabs';
import { useFolderHandleStore } from '@/lib/store/folder-handle';
import { useAccountStore } from '@/lib/store/account';

const DEBOUNCE_MS = 800;

/**
 * Mounts once at the workspace level. Restores any persisted FSA folder
 * handle on first paint, then watches the editor-tabs store for changes to
 * `source: 'disk'` docs and writes them back to disk with a debounce.
 *
 * Renders nothing — pure side-effect component.
 */
export function FolderSync(): null {
  const account = useAccountStore((s) => s.active);
  const restore = useFolderHandleStore((s) => s.restore);

  // Restore on mount + on account swap.
  useEffect(() => {
    void restore(account);
  }, [account, restore]);

  // Track lastSavedAt per disk-source doc; on change, debounce-write to disk.
  const lastSeenRef = useRef<Record<string, number>>({});
  const timerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const unsub = useEditorTabsStore.subscribe((state) => {
      const handle = useFolderHandleStore.getState().handle;
      if (!handle) return;
      for (const doc of Object.values(state.docs)) {
        if (doc.source !== 'disk') continue;
        const seen = lastSeenRef.current[doc.id] ?? 0;
        if (doc.lastSavedAt <= seen) continue;
        lastSeenRef.current[doc.id] = doc.lastSavedAt;
        const prev = timerRef.current[doc.id];
        if (prev) clearTimeout(prev);
        timerRef.current[doc.id] = setTimeout(() => {
          void useFolderHandleStore
            .getState()
            .pushDoc(doc.id, doc.filename, htmlToMarkdownish(doc.htmlContent))
            .catch(() => {
              // Permission revoked, disk full, file deleted — surface
              // gently next save attempt; for now silent (user can
              // re-bind via the vault folder button).
            });
        }, DEBOUNCE_MS);
      }
    });
    return () => {
      unsub();
      for (const t of Object.values(timerRef.current)) clearTimeout(t);
      timerRef.current = {};
    };
  }, []);

  return null;
}

/** Best-effort HTML → markdown-ish conversion for disk save. */
function htmlToMarkdownish(html: string): string {
  return html
    .replace(/<h([1-6])>(.+?)<\/h\1>/gi, (_m, n: string, t: string) => `${'#'.repeat(Number(n))} ${t}\n\n`)
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong>(.+?)<\/strong>/gi, '**$1**')
    .replace(/<em>(.+?)<\/em>/gi, '*$1*')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default FolderSync;
