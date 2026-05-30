import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { detectTokenSource } from '@/core/import/shared/tokenResolver/detectSources';

const FIXTURE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../fixtures/token-resolver',
);

const REPO = 'https://github.com/acme/demo';

const REPO_PATHS = [
  'tailwind.config.js',
  'src/app/globals.css',
  'design/tokens.json',
  'tests/fixtures/sandbox-import/app/globals.css',
];

describe('detectTokenSource', () => {
  it('prefers tailwind v3 config over CSS when both exist', async () => {
    const v3 = readFileSync(join(FIXTURE_DIR, 'tailwind.v3.config.fixture.txt'), 'utf8');
    const v4 = readFileSync(join(FIXTURE_DIR, 'tailwind.v4.globals.css'), 'utf8');
    const tokens = readFileSync(join(FIXTURE_DIR, 'design-tokens-theme-slice.json'), 'utf8');

    const result = await detectTokenSource(
      REPO,
      async function (path: string) {
        if (path === 'tailwind.config.js') {
          return { text: v3, sha: 'sha-v3' };
        }
        if (path === 'src/app/globals.css') {
          return { text: v4, sha: 'sha-v4' };
        }
        if (path === 'design/tokens.json') {
          return { text: tokens, sha: 'sha-tokens' };
        }
        return null;
      },
      undefined,
      REPO_PATHS,
    );

    expect(result).not.toBeNull();
    expect(result!.source.kind).toBe('tailwind-v3-config');
    expect(result!.classToVariable['bg-primary']).toBe('color/primary/default');
  });

  it('detects tailwind v4 CSS when no config present', async () => {
    const v4 = readFileSync(join(FIXTURE_DIR, 'tailwind.v4.globals.css'), 'utf8');

    const result = await detectTokenSource(
      REPO,
      async function (path: string) {
        if (path === 'tests/fixtures/sandbox-import/app/globals.css') {
          return { text: v4, sha: 'sha-v4' };
        }
        return null;
      },
      undefined,
      ['tests/fixtures/sandbox-import/app/globals.css'],
    );

    expect(result).not.toBeNull();
    expect(result!.source.kind).toBe('tailwind-v4-css');
    expect(result!.source.path).toBe('tests/fixtures/sandbox-import/app/globals.css');
    expect(result!.classToVariable['bg-primary']).toBe('color/primary/default');
  });

  it('detects configured DTCG tokens path when no Tailwind/CSS theme exists', async function () {
    const dtcg = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../../../../fixtures/io/sources/tokens-dtcg.json'),
      'utf8',
    );

    const result = await detectTokenSource(
      REPO,
      async function (path: string) {
        if (path === 'design/tokens.json') {
          return { text: dtcg, sha: 'sha-dtcg' };
        }
        return null;
      },
      'design/tokens.json',
      ['design/tokens.json'],
    );

    expect(result).not.toBeNull();
    expect(result!.source.kind).toBe('dtcg-tokens');
    expect(result!.source.path).toBe('design/tokens.json');
  });
});
