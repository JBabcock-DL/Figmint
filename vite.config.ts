import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const rootDir = resolve(__dirname);
const buildThread = process.env.VITE_BUILD_THREAD === 'ui' ? 'ui' : 'main';

const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8')) as {
  version: string;
};

/** Loaded from `.env.local` / `.env` — see `.env.example`. */
function loadFigHubEnv(key: string): string {
  const mode = process.env.NODE_ENV === 'development' ? 'development' : 'production';
  const env = loadEnv(mode, rootDir, '');
  return env[key] ?? '';
}

const githubOAuthClientId = loadFigHubEnv('GITHUB_OAUTH_CLIENT_ID');
const fighubOAuthRelayUrl = loadFigHubEnv('FIGHUB_OAUTH_RELAY_URL');

const sharedResolve = {
  alias: [
    { find: '@/config/flags', replacement: resolve(rootDir, 'src/config/flags.ts') },
    { find: '@', replacement: resolve(rootDir, 'src') },
  ],
};

const sharedDefine = {
  'import.meta.env.PACKAGE_VERSION': JSON.stringify(pkg.version),
  'import.meta.env.GITHUB_OAUTH_CLIENT_ID': JSON.stringify(githubOAuthClientId),
  'import.meta.env.FIGHUB_OAUTH_RELAY_URL': JSON.stringify(fighubOAuthRelayUrl),
};

/**
 * Reads the finalized `dist/ui.html` and returns base64 for Vite `define` substitution.
 * Base64 avoids literal `import(` in `code.js` (Figma QuickJS rejects that substring).
 */
function loadUiHtmlBase64ForDefine(): string {
  const distUi = resolve(rootDir, 'dist/ui.html');
  if (!existsSync(distUi)) {
    return JSON.stringify('');
  }
  const base64 = Buffer.from(readFileSync(distUi, 'utf8'), 'utf8').toString('base64');
  return JSON.stringify(base64);
}

export default defineConfig(() => {
  if (buildThread === 'main') {
    return {
      plugins: [],
      resolve: sharedResolve,
      define: {
        ...sharedDefine,
        __HTML_B64__: loadUiHtmlBase64ForDefine(),
      },
      build: {
        emptyOutDir: false,
        outDir: 'dist',
        target: 'es2017',
        lib: {
          entry: resolve(rootDir, 'src/main.ts'),
          formats: ['iife'],
          name: 'FigHubPlugin',
          fileName: () => 'code.js',
        },
        rollupOptions: {
          output: {
            extend: true,
          },
        },
      },
    };
  }

  return {
    plugins: [
      react(),
      viteSingleFile({
        useRecommendedBuildConfig: true,
        removeViteModuleLoader: true,
      }),
    ],
    resolve: sharedResolve,
    define: sharedDefine,
    build: {
      emptyOutDir: false,
      outDir: 'dist',
      rollupOptions: {
        input: resolve(rootDir, 'src/ui/index.html'),
      },
    },
  };
});
