import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/config/flags': resolve(__dirname, './src/config/flags.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup/dom.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'src/core/**/*.test.ts'],
  },
});
