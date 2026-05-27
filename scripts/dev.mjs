import { copyFileSync, mkdirSync } from 'node:fs';
import concurrently from 'concurrently';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

mkdirSync(resolve(rootDir, 'dist'), { recursive: true });
copyFileSync(resolve(rootDir, 'manifest.community.json'), resolve(rootDir, 'dist/manifest.json'));

const { result } = concurrently(
  [
    {
      command: 'npx vite build --watch',
      env: { BUILD_TARGET: 'community', VITE_BUILD_THREAD: 'main' },
      name: 'main',
    },
    {
      command: 'npx vite build --watch && node scripts/finalize-ui-html.mjs',
      env: { BUILD_TARGET: 'community', VITE_BUILD_THREAD: 'ui' },
      name: 'ui',
    },
  ],
  {
    cwd: rootDir,
    prefix: 'name',
    killOthers: ['failure'],
  },
);

await result;
