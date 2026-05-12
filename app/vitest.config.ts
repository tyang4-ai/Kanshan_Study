import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts', '**/node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // Next.js' `server-only` package throws on import in non-server
      // environments. Vitest runs in Node (effectively server-side), but
      // jest-dom + jsdom environment confuses the heuristic. Stub it to a
      // no-op so tests can still import modules that use `import 'server-only'`.
      'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
    },
  },
});
