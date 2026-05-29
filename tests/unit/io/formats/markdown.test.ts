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

function loadFixture(name: string): FormattableDocument {
  return JSON.parse(readFileSync(join(fixturesDir, `${name}.json`), 'utf8')) as FormattableDocument;
}

function loadGolden(name: string): string {
  return readFileSync(join(fixturesDir, `${name}.md`), 'utf8').replace(/\r\n/g, '\n');
}

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, '\n');
}

describe('markdown golden fixtures', () => {
  it.each([
    'drift-report-ac',
    'handoff-context-min',
    'component-spec-button',
    'ops-program-bootstrap',
    'tokens-preview-sample',
    'audit-report-push',
  ] as const)('matches golden markdown for %s', (fixtureName) => {
    const doc = loadFixture(fixtureName);
    const actual = normalizeNewlines(format(doc, 'md'));
    const expected = loadGolden(fixtureName);
    expect(actual).toBe(expected);
  });
});

describe('tokens preview cap', () => {
  it('truncates markdown token table at 50 rows with footer', () => {
    const doc = loadFixture('tokens-truncated');
    const markdown = format(doc, 'md');
    expect(markdown).toContain('_… and 10 more tokens_');
    const dataRows = markdown.split('\n').filter((line) => line.startsWith('| layout | space/'));
    expect(dataRows.length).toBe(50);
  });
});

describe('shared markdown helpers via renderers', () => {
  it('includes handoff screenshot image syntax', () => {
    const markdown = format(loadFixture('handoff-context-min'), 'md');
    expect(markdown).toMatch(/!\[Login Screen\]\(data:image\/png;base64,/);
  });

  it('includes components-used and tokens-used sections', () => {
    const markdown = format(loadFixture('handoff-context-min'), 'md');
    expect(markdown).toContain('## Components used');
    expect(markdown).toContain('## Tokens used');
    expect(markdown).toContain('- Theme/Primary');
  });
});
