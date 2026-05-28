import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const distDir = resolve(rootDir, 'dist');
rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

function patchDistManifest() {
  const env = loadEnv('production', rootDir, '');
  const relayUrl = (env.FIGHUB_OAUTH_RELAY_URL ?? '').trim().replace(/\/$/, '');
  const manifestPath = resolve(distDir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.networkAccess = manifest.networkAccess ?? {};
  manifest.networkAccess.allowedDomains = relayUrl ? [relayUrl] : ['none'];
  manifest.networkAccess.devAllowedDomains = manifest.networkAccess.devAllowedDomains ?? [
    'http://localhost:8787',
  ];
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function runVite(thread) {
  const result = spawnSync('npx', ['vite', 'build'], {
    cwd: rootDir,
    env: {
      ...process.env,
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

copyFileSync(resolve(rootDir, 'manifest.json'), resolve(rootDir, 'dist/manifest.json'));
patchDistManifest();
console.log('✓ build complete → dist/');
