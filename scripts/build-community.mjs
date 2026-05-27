import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const distDir = resolve(rootDir, 'dist');
rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

function runVite(thread) {
  const result = spawnSync('npx', ['vite', 'build'], {
    cwd: rootDir,
    env: {
      ...process.env,
      BUILD_TARGET: 'community',
      VITE_BUILD_THREAD: thread,
    },
    shell: true,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runFinalize() {
  const result = spawnSync('node', ['scripts/finalize-ui-html.mjs'], {
    cwd: rootDir,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// Order is required: UI must be built and finalized first so the main-thread Vite config
// can inject `__html__` via `define` from the finalized `dist/ui.html`.
runVite('ui');
runFinalize();
runVite('main');

copyFileSync(resolve(rootDir, 'manifest.community.json'), resolve(rootDir, 'dist/manifest.json'));
console.log('✓ community build complete → dist/');
