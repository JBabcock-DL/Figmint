import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { FormattableDocument } from '@/io/formats';
import { format } from '@/io/formats';

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../src/io/formats/__fixtures__',
);

function loadFixture<T extends FormattableDocument>(name: string): T {
  return JSON.parse(readFileSync(join(fixturesDir, `${name}.json`), 'utf8')) as T;
}

describe('format()', () => {
  it.each([
    ['drift-report-ac', 'drift-report'],
    ['handoff-context-min', 'handoff-context'],
    ['component-spec-button', 'component-spec'],
    ['ops-program-bootstrap', 'ops-program'],
    ['tokens-preview-sample', 'tokens'],
    ['audit-report-push', 'audit-report'],
  ] as const)('serializes %s as JSON and markdown', (fixtureName, kind) => {
    const doc = loadFixture(fixtureName);
    expect(doc.kind).toBe(kind);
    expect(format(doc, 'json')).toContain(`"kind": "${kind}"`);
    expect(format(doc, 'md')).toContain(`# ${kind} v1`);
  });

  it('throws for unsupported registry kind', () => {
    expect(() => format({ v: 1, kind: 'registry' } as never, 'md')).toThrow(
      'Unsupported document kind: registry',
    );
  });
});
