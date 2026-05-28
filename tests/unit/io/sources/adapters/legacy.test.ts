import { describe, expect, it } from 'vitest';

import { adaptLegacy } from '@/io/sources/adapters/legacy';
import type { TokensV1Legacy } from '@detroitlabs/fighub-contracts';

import { loadAdapterFixture } from './helpers';

describe('adaptLegacy', () => {
  const input = loadAdapterFixture('legacy-foundations-min.json') as TokensV1Legacy;

  it('produces canonical envelope', () => {
    const result = adaptLegacy(input);
    expect(result.v).toBe(1);
    expect(result.kind).toBe('tokens');
  });

  it('emits at least 20 tokens without dots in names', () => {
    const result = adaptLegacy(input);
    expect(result.tokens.length).toBeGreaterThanOrEqual(20);
    for (const token of result.tokens) {
      expect(token.name.includes('.')).toBe(false);
      expect(token.collection).toBeTruthy();
    }
  });

  it('resolves Theme alias to structured aliasOf', () => {
    const result = adaptLegacy(input);
    const themePrimary = result.tokens.find(
      (token) => token.collection === 'theme' && token.name === 'color/primary/default',
    );
    expect(themePrimary).toBeDefined();
    const light = themePrimary?.valuesByMode.Light;
    expect(light).toEqual({
      aliasOf: { collection: 'primitives', name: 'color/primary/500' },
    });
  });

  it('uses only WEB|ANDROID|iOS codeSyntax keys when present', () => {
    const result = adaptLegacy(input);
    for (const token of result.tokens) {
      if (!token.codeSyntax) {
        continue;
      }
      for (const key of Object.keys(token.codeSyntax)) {
        expect(['WEB', 'ANDROID', 'iOS']).toContain(key);
      }
    }
  });

  it('emits locked collection mode lists', () => {
    const result = adaptLegacy(input);
    expect(result.collections.map((collection) => collection.id)).toEqual([
      'primitives',
      'theme',
      'typography',
      'layout',
      'effects',
    ]);
    expect(result.collections.find((collection) => collection.id === 'theme')?.modes).toEqual([
      'Light',
      'Dark',
    ]);
    expect(result.collections.find((collection) => collection.id === 'typography')?.modes).toEqual([
      '85',
      '100',
      '110',
      '120',
      '130',
      '150',
      '175',
      '200',
    ]);
  });
});
