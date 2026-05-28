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
function loadGithubOAuthClientId(): string {
  const mode = process.env.NODE_ENV === 'development' ? 'development' : 'production';
  const env = loadEnv(mode, rootDir, '');
  return env.GITHUB_OAUTH_CLIENT_ID ?? '';
}

const githubOAuthClientId = loadGithubOAuthClientId();

const sharedResolve = {
  alias: [
    { find: '@/config/flags', replacement: resolve(rootDir, 'src/config/flags.ts') },
    { find: '@', replacement: resolve(rootDir, 'src') },
  ],
};

const sharedDefine = {
  'import.meta.env.PACKAGE_VERSION': JSON.stringify(pkg.version),
  'import.meta.env.GITHUB_OAUTH_CLIENT_ID': JSON.stringify(githubOAuthClientId),
};

/**
 * Reads the finalized `dist/ui.html` (built and post-processed during the UI thread pass)
 * and returns it as a JSON-stringified literal for Vite `define` substitution.
 */
function loadUiHtmlForDefine(): string {
  const distUi = resolve(rootDir, 'dist/ui.html');
  if (!existsSync(distUi)) {
    return JSON.stringify('');
  }
  return JSON.stringify(readFileSync(distUi, 'utf8'));
}

export default defineConfig(() => {
  if (buildThread === 'main') {
    return {
      plugins: [],
      resolve: sharedResolve,
      define: {
        ...sharedDefine,
        __html__: loadUiHtmlForDefine(),
      },
      build: {
        emptyOutDir: false,
        outDir: 'dist',
        target: 'es2017',
        lib: {
          entry: resolve(rootDir, 'src/main.ts'),
          formats: ['iife'],
          name: 'FigmintPlugin',
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
