import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const buildTarget = process.env.BUILD_TARGET === 'org' ? 'org' : 'community';
const buildThread = process.env.VITE_BUILD_THREAD === 'ui' ? 'ui' : 'main';
const flagsFile =
  buildTarget === 'org'
    ? resolve(__dirname, 'src/config/flags.org.ts')
    : resolve(__dirname, 'src/config/flags.community.ts');

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as {
  version: string;
};

const sharedResolve = {
  alias: [
    { find: '@/config/flags', replacement: flagsFile },
    { find: '@', replacement: resolve(__dirname, 'src') },
  ],
};

const sharedDefine = {
  'import.meta.env.BUILD_TARGET': JSON.stringify(buildTarget),
  'import.meta.env.PACKAGE_VERSION': JSON.stringify(pkg.version),
};

/**
 * Reads the finalized `dist/ui.html` (built and post-processed during the UI thread pass)
 * and returns it as a JSON-stringified literal for Vite `define` substitution.
 * Mirrors how the Figma plugin runtime injects `__html__` — the global gets replaced at
 * build time with the literal contents of `manifest.ui`.
 */
function loadUiHtmlForDefine(): string {
  const distUi = resolve(__dirname, 'dist/ui.html');
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
        // The build-community/build-org scripts wipe `dist/` once up front so we never
        // clobber the UI HTML produced by the earlier UI pass.
        emptyOutDir: false,
        outDir: 'dist',
        // Figma's plugin sandbox doesn't support ES2020+ syntax (?. ?? replaceAll).
        target: 'es2017',
        lib: {
          entry: resolve(__dirname, 'src/main.ts'),
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
        input: resolve(__dirname, 'src/ui/index.html'),
      },
    },
  };
});
