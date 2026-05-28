import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { loadFromPasteEvent } from '@/io/sources/clipboard';
import { loadFromFile } from '@/io/sources/file';
import { loadFromPaste } from '@/io/sources/paste';
import { PASTE_MAX } from '@/io/sources/types';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/io/sources');

function fixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8');
}

function makeFile(content: string, name: string, type = 'application/json'): File {
  const file = new File([content], name, { type });
  Object.defineProperty(file, 'text', {
    configurable: true,
    value: () => Promise.resolve(content),
  });
  return file;
}

function makePasteEvent(text: string): ClipboardEvent {
  return {
    clipboardData: {
      getData: () => text,
    },
  } as unknown as ClipboardEvent;
}

const happyFixtures = [
  ['ops-program.json', 'ops-program'],
  ['component-spec.json', 'component-spec'],
  ['drift-report.json', 'drift-report'],
  ['handoff-context.json', 'handoff-context'],
  ['registry.json', 'registry'],
  ['tokens-legacy.json', 'tokens-legacy'],
  ['tokens-dtcg.json', 'tokens-dtcg'],
] as const;

describe('loadFromPaste', () => {
  it.each(happyFixtures)('loads %s as %s', async (fileName, kind) => {
    const result = await loadFromPaste(fixture(fileName));
    expect(result).toMatchObject({ kind, sourceMeta: { port: 'paste' } });
    expect('payload' in result).toBe(true);
  });

  it('returns empty for blank input', async () => {
    const result = await loadFromPaste('');
    expect(result).toMatchObject({ kind: 'empty', location: { source: 'paste' } });
  });

  it('returns oversize for input over PASTE_MAX', async () => {
    const result = await loadFromPaste('x'.repeat(PASTE_MAX + 1));
    expect(result).toMatchObject({ kind: 'oversize', location: { source: 'paste' } });
  });

  it('returns invalid-json for malformed JSON', async () => {
    const result = await loadFromPaste(fixture('invalid.json'));
    expect(result).toMatchObject({ kind: 'invalid-json', location: { source: 'paste' } });
  });
});

describe('loadFromFile', () => {
  it.each(happyFixtures)('loads %s via picker as %s', async (fileName, kind) => {
    const result = await loadFromFile(makeFile(fixture(fileName), fileName), 'picker');
    expect(result).toMatchObject({
      kind,
      sourceMeta: { port: 'file', via: 'picker', fileName },
    });
  });

  it('loads via dragdrop', async () => {
    const result = await loadFromFile(
      makeFile(fixture('ops-program.json'), 'ops-program.json'),
      'dragdrop',
    );
    expect(result).toMatchObject({
      kind: 'ops-program',
      sourceMeta: { port: 'file', via: 'dragdrop' },
    });
  });

  it('rejects .md files', async () => {
    const result = await loadFromFile(makeFile('# Title', 'notes.md', 'text/markdown'));
    expect(result).toMatchObject({
      kind: 'unsupported-type',
      hint: 'Markdown is export-only. Paste or load JSON.',
      location: { source: 'file', fileName: 'notes.md' },
    });
  });

  it('rejects unsupported extensions', async () => {
    const result = await loadFromFile(makeFile('data', 'data.txt', 'text/plain'));
    expect(result).toMatchObject({ kind: 'unsupported-type' });
  });

  it('returns invalid-json for malformed JSON file', async () => {
    const result = await loadFromFile(makeFile(fixture('invalid.json'), 'invalid.json'));
    expect(result).toMatchObject({ kind: 'invalid-json' });
  });
});

describe('loadFromPasteEvent', () => {
  it.each(happyFixtures)('loads %s as %s', async (fileName, kind) => {
    const result = await loadFromPasteEvent(makePasteEvent(fixture(fileName)));
    expect(result).toMatchObject({
      kind,
      sourceMeta: { port: 'clipboard', mechanism: 'paste-event' },
    });
  });

  it('returns null when clipboard has no text', async () => {
    const result = await loadFromPasteEvent(makePasteEvent(''));
    expect(result).toBeNull();
  });

  it('returns invalid-json for malformed JSON', async () => {
    const result = await loadFromPasteEvent(makePasteEvent(fixture('invalid.json')));
    expect(result).toMatchObject({ kind: 'invalid-json', location: { source: 'clipboard' } });
  });
});
