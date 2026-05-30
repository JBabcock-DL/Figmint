import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { createTokenResolverAsync } from '@/core/import/shared/tokenResolver';

const FIXTURE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../fixtures/token-resolver',
);
const REPO = 'https://github.com/acme/demo';

describe('tailwind v4 theme integration', () => {
  it('createTokenResolver resolves bg-primary to color/primary/default', async () => {
    const v4 = readFileSync(join(FIXTURE_DIR, 'tailwind.v4.globals.css'), 'utf8');

    const resolver = await createTokenResolverAsync({
      repoUrl: REPO,
      disableCache: true,
      repoPaths: ['src/app/globals.css'],
      fetchText: async function (path: string) {
        if (path === 'src/app/globals.css') {
          return { text: v4 };
        }
        return null;
      },
    });

    expect(resolver.resolve('bg-primary')).toEqual({
      ok: true,
      variable: 'color/primary/default',
    });
  });
});
