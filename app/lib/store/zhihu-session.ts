'use client';
// Track #15.10 — client-side zhihu OAuth session mirror.
// Backend writes the actual session cookie at /api/auth/zhihu/callback; this
// store holds the *display* shape (uid + fullname + avatarPath + exp) read
// back from /api/auth/zhihu/me. `hydrate()` is called by TitleBar on mount
// and by AuthErrorToast on the `?auth=success` redirect.
//
// The shape here is the contract the UI slab (TitleBar badge / OnboardingGate
// skip-detection / SettingsTab / AuthErrorToast) reads from. If the backend
// renames a field, this file is the only thing to update.

import { create } from 'zustand';

export interface ZhihuSessionPayload {
  // String — zhihu UIDs are 19-digit snowflakes that overflow Number precision.
  uid: string;
  fullname: string;
  avatarPath: string | null;
  // ms since epoch — matches the server's `exp: Date.now() + N * 1000`.
  exp: number;
}

interface ZhihuSessionState {
  uid: string | null;
  fullname: string | null;
  avatarPath: string | null;
  exp: number | null;
  hydrated: boolean;
  /** r6 demo-mode bypass: true when the user clicked 「演示模式 · 跳过登录」
   *  instead of going through 知乎 OAuth. Persisted in localStorage so the
   *  workspace doesn't re-show the gate on reload. */
  demoMode: boolean;
  hydrate: () => Promise<void>;
  set: (payload: ZhihuSessionPayload) => void;
  clear: () => void;
  skipLogin: () => void;
}

const DEMO_FLAG_KEY = 'kanshan-demo-mode';
const DEMO_UID_KEY = 'kanshan-demo-uid';

function readOrGenerateDemoUid(): string {
  if (typeof window === 'undefined') return 'demo-ssr';
  let uid = window.localStorage.getItem(DEMO_UID_KEY);
  if (!uid) {
    // 8-char browser-local demo id; stable across reloads, isolated per browser.
    uid = `demo-${Math.random().toString(36).slice(2, 10)}`;
    try {
      window.localStorage.setItem(DEMO_UID_KEY, uid);
    } catch {
      /* storage may be unavailable in some browsing modes — non-fatal */
    }
  }
  return uid;
}

export const useZhihuSessionStore = create<ZhihuSessionState>((set) => ({
  uid: null,
  fullname: null,
  avatarPath: null,
  exp: null,
  hydrated: false,
  demoMode: false,
  async hydrate() {
    // r6 demo-mode: if the user previously clicked the skip button on this
    // browser, restore the demo identity from localStorage instead of hitting
    // the server. This keeps the workspace open across reloads without ever
    // needing 知乎 OAuth.
    if (typeof window !== 'undefined' && window.localStorage.getItem(DEMO_FLAG_KEY) === '1') {
      const uid = readOrGenerateDemoUid();
      set({
        uid,
        fullname: '演示用户 · 顾婉昔',
        avatarPath: null,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
        hydrated: true,
        demoMode: true,
      });
      return;
    }
    try {
      const res = await fetch('/api/auth/zhihu/me', { credentials: 'same-origin' });
      if (res.status === 200) {
        const data = (await res.json()) as ZhihuSessionPayload;
        set({
          uid: data.uid,
          fullname: data.fullname,
          avatarPath: data.avatarPath ?? null,
          exp: data.exp,
          hydrated: true,
          demoMode: false,
        });
        return;
      }
      // 401 / other — not logged in. Mark hydrated so UI knows we tried.
      set({ uid: null, fullname: null, avatarPath: null, exp: null, hydrated: true, demoMode: false });
    } catch {
      set({ hydrated: true });
    }
  },
  set(payload) {
    set({
      uid: payload.uid,
      fullname: payload.fullname,
      avatarPath: payload.avatarPath,
      exp: payload.exp,
      hydrated: true,
      demoMode: false,
    });
  },
  clear() {
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(DEMO_FLAG_KEY); } catch { /* non-fatal */ }
    }
    set({ uid: null, fullname: null, avatarPath: null, exp: null, hydrated: true, demoMode: false });
  },
  /** r6 OAuth-bypass: seat the user as a per-browser stable 演示用户 without
   *  going through 知乎. All workspace state (editor, corkboard, last-visit,
   *  persona masks) persists locally via Zustand persist middleware, so the
   *  same browser sees the same workspace on reload. */
  skipLogin() {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(DEMO_FLAG_KEY, '1');
      } catch { /* non-fatal */ }
    }
    const uid = readOrGenerateDemoUid();
    set({
      uid,
      fullname: '演示用户 · 顾婉昔',
      avatarPath: null,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      hydrated: true,
      demoMode: true,
    });
  },
}));
