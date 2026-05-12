// No-op stub for Next.js' `server-only` package, used by vitest only.
// The real module throws when imported in a client bundle, which is what
// surfaces accidental client imports of server modules during a Next build.
// In tests we just want the import to succeed.
export {};
