import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { detectContract } from '@/io/sources/detect';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures/io/sources');

function fixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8');
}

describe('detectContract', () => {
  it('detects ops-program', () => {
    expect(detectContract(fixture('ops-program.json'))).toBe('ops-program');
  });

  it('detects component-spec', () => {
    expect(detectContract(fixture('component-spec.json'))).toBe('component-spec');
  });

  it('detects drift-report', () => {
    expect(detectContract(fixture('drift-report.json'))).toBe('drift-report');
  });

  it('detects handoff-context', () => {
    expect(detectContract(fixture('handoff-context.json'))).toBe('handoff-context');
  });

  it('detects registry', () => {
    expect(detectContract(fixture('registry.json'))).toBe('registry');
  });

  it('detects tokens-legacy', () => {
    expect(detectContract(fixture('tokens-legacy.json'))).toBe('tokens-legacy');
  });

  it('detects tokens-dtcg', () => {
    expect(detectContract(fixture('tokens-dtcg.json'))).toBe('tokens-dtcg');
  });

  it('rejects top-level array', () => {
    expect(detectContract(fixture('top-level-array.json'))).toBeNull();
  });

  it('rejects top-level scalar string JSON', () => {
    expect(detectContract('"hello"')).toBeNull();
  });

  it('rejects malformed JSON', () => {
    expect(detectContract(fixture('invalid.json'))).toBeNull();
  });

  it('rejects empty object', () => {
    expect(detectContract(fixture('empty-object.json'))).toBeNull();
  });

  it('rejects unknown v1 kind', () => {
    expect(detectContract(fixture('unknown-v1-kind.json'))).toBeNull();
  });

  it('rejects v2 forward-compat envelope', () => {
    expect(detectContract(fixture('v2-ops-program.json'))).toBeNull();
  });

  it('rejects generic collections wrapper', () => {
    expect(detectContract(fixture('generic-collections.json'))).toBeNull();
  });

  it('rejects DTCG leaf with $value only (no $type)', () => {
    expect(detectContract(fixture('dtcg-value-only.json'))).toBeNull();
  });

  it('detects DTCG with $schema present', () => {
    const input = JSON.stringify({
      $schema: 'https://design-tokens.github.io/community-group/format/',
      color: { primary: { $value: '#000', $type: 'color' } },
    });
    expect(detectContract(input)).toBe('tokens-dtcg');
  });
});
