import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { readCssThemeSource } from '@/core/import/shared/tokenResolver/cssThemeReader';

const FIXTURE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../fixtures/token-resolver',
);

describe('cssThemeReader', () => {
  it('parses v4 @theme inline and links bg-primary to primary semantic', () => {
    const text = readFileSync(join(FIXTURE_DIR, 'tailwind.v4.globals.css'), 'utf8');
    const result = readCssThemeSource(text);
    expect(result.rawMap['bg-primary']).toBe('primary');
    expect(result.rawMap['text-primary']).toBe('primary');
  });
});
