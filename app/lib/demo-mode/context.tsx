'use client';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useRef } from 'react';

export type DemoMode = 'live' | 'clickthrough';

interface DemoModeContextValue {
  mode: DemoMode;
}

const DemoModeContext = createContext<DemoModeContextValue>({ mode: 'clickthrough' });

interface DemoModeProviderProps {
  mode: DemoMode;
  children: ReactNode;
}

// While mode='live' is mounted, every window.fetch() call gets the
// `x-kanshan-cache-mode: cache-only` header injected. Server-side withCache
// reads this header and forces cache-only behavior.
//
// Restored on unmount. Only one provider can be active at a time —
// nesting would cause patch-on-patch and we don't need it.
export function DemoModeProvider({ mode, children }: DemoModeProviderProps) {
  const patchedRef = useRef<typeof window.fetch | null>(null);

  useEffect(() => {
    if (mode !== 'live') return;
    if (typeof window === 'undefined') return;
    if (patchedRef.current) return;
    const original = window.fetch;
    patchedRef.current = original;
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers ?? {});
      if (!headers.has('x-kanshan-cache-mode')) {
        headers.set('x-kanshan-cache-mode', 'cache-only');
      }
      return original.call(window, input, { ...init, headers });
    }) as typeof window.fetch;
    return () => {
      if (patchedRef.current) {
        window.fetch = patchedRef.current;
        patchedRef.current = null;
      }
    };
  }, [mode]);

  return <DemoModeContext.Provider value={{ mode }}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): DemoMode {
  return useContext(DemoModeContext).mode;
}
