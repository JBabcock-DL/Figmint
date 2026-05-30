import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  buildCanonicalMapFromDesignTokens,
  resolveCanonicalPath,
} from '@/core/import/shared/tokenResolver/tailwindToCanonicalPath';

const FIXTURE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../fixtures/token-resolver',
);

describe('tailwindToCanonicalPath', () => {
  it('maps --color-primary-default to color/primary/default', () => {
    const json = JSON.parse(
      readFileSync(join(FIXTURE_DIR, 'design-tokens-theme-slice.json'), 'utf8'),
    );
    const map = buildCanonicalMapFromDesignTokens(json);
    expect(map['--color-primary-default']).toBe('color/primary/default');
    expect(resolveCanonicalPath('primary', 'default', 'bg', map)).toBe('color/primary/default');
    expect(resolveCanonicalPath('primary', 'content', 'text', map)).toBe('color/primary/content');
  });
});
