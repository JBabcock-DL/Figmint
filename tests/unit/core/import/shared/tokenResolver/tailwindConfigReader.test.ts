import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { readTailwindConfigSource } from '@/core/import/shared/tokenResolver/tailwindConfigReader';

const FIXTURE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../fixtures/token-resolver',
);

describe('tailwindConfigReader', () => {
  it('extracts primary from theme.extend colors', () => {
    const text = readFileSync(join(FIXTURE_DIR, 'tailwind.v3.config.fixture.txt'), 'utf8');
    const result = readTailwindConfigSource(text);
    expect(result.rawMap['bg-primary']).toBe('primary');
    expect(result.rawMap['bg-muted']).toBe('muted');
  });
});
