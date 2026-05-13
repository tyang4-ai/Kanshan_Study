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
  hydrate: () => Promise<void>;
  set: (payload: ZhihuSessionPayload) => void;
  clear: () => void;
}

export const useZhihuSessionStore = create<ZhihuSessionState>((set) => ({
  uid: null,
  fullname: null,
  avatarPath: null,
  exp: null,
  hydrated: false,
  async hydrate() {
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
        });
        return;
      }
      // 401 / other — not logged in. Mark hydrated so UI knows we tried.
      set({ uid: null, fullname: null, avatarPath: null, exp: null, hydrated: true });
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
    });
  },
  clear() {
    set({ uid: null, fullname: null, avatarPath: null, exp: null, hydrated: true });
  },
}));
