import { describe, expect, it } from 'vitest';

import { deriveComponentsRoot } from '@/core/import/shared/deriveComponentsRoot';
import {
  discoverCssThemePaths,
  discoverImportSourceRoot,
  discoverTailwindConfigPaths,
} from '@/io/github/repoPathDiscovery';

describe('repoPathDiscovery', () => {
  it('discovers tailwind config paths by basename anywhere in the tree', () => {
    const paths = discoverTailwindConfigPaths([
      'packages/web/tailwind.config.ts',
      'tailwind.config.js',
      'node_modules/foo/tailwind.config.js',
    ]);
    expect(paths[0]).toBe('tailwind.config.js');
    expect(paths).toContain('packages/web/tailwind.config.ts');
    expect(paths).not.toContain('node_modules/foo/tailwind.config.js');
  });

  it('discovers css theme files by basename', () => {
    const paths = discoverCssThemePaths([
      'tests/fixtures/sandbox-import/app/globals.css',
      'src/styles/theme.css',
      'dist/app/globals.css',
    ]);
    expect(paths[0]).toBe('tests/fixtures/sandbox-import/app/globals.css');
    expect(paths).not.toContain('dist/app/globals.css');
  });

  it('picks the densest import source directory from the repo tree', () => {
    const repoPaths = [
      'tests/fixtures/sandbox-import/design/components/button.component-spec.v1.json',
      'tests/fixtures/sandbox-import/components/ui/button.tsx',
      'tests/fixtures/sandbox-import/components/ui/icon.tsx',
      'tests/fixtures/sandbox-import/components/ui/badge.tsx',
      'components/legacy/card.tsx',
    ];
    const root = discoverImportSourceRoot(
      repoPaths,
      'react',
      'tests/fixtures/sandbox-import/design/components',
    );
    expect(root).toBe('tests/fixtures/sandbox-import/components/ui/');
  });

  it('falls back to deriveComponentsRoot when no source files exist', () => {
    expect(discoverImportSourceRoot([], 'react', 'design/components')).toBe(
      deriveComponentsRoot('design/components'),
    );
  });
});
