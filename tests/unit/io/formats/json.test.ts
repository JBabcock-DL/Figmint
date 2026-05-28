import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { stableStringify } from '@/io/formats';

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../src/io/formats/__fixtures__/json',
);

function loadJson(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'));
}

describe('stableStringify', () => {
  it('produces identical output for semantically equal objects with different key order', () => {
    const a = loadJson('key-order-a.json');
    const b = loadJson('key-order-b.json');
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it('matches committed key-order-expected.json', () => {
    const input = loadJson('key-order-a.json');
    const expected = readFileSync(join(fixturesDir, 'key-order-expected.json'), 'utf8').trimEnd();
    expect(stableStringify(input)).toBe(expected);
  });
});
