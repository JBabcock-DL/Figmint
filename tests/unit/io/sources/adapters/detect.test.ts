import { describe, expect, it } from 'vitest';

import { detectFormat } from '@/io/sources/adapters/detect';
import type { TokensV1 } from '@detroitlabs/fighub-contracts';

import { loadAdapterFixture } from './helpers';

describe('detectFormat', () => {
  it('detects legacy foundations fixture', () => {
    expect(detectFormat(loadAdapterFixture('legacy-foundations-min.json'))).toBe('legacy');
  });

  it('detects dtcg foundations fixture', () => {
    expect(detectFormat(loadAdapterFixture('dtcg-foundations-min.json'))).toBe('dtcg');
  });

  it('returns null for empty object', () => {
    const invalid = loadAdapterFixture('invalid-ambiguous.json') as {
      emptyObject: unknown;
      unknownLegacyCollection: unknown;
      dtcgMissingType: unknown;
    };
    expect(detectFormat(invalid.emptyObject)).toBeNull();
  });

  it('returns null for unknown legacy collection', () => {
    const invalid = loadAdapterFixture('invalid-ambiguous.json') as {
      unknownLegacyCollection: unknown;
    };
    expect(detectFormat(invalid.unknownLegacyCollection)).toBeNull();
  });

  it('returns null for DTCG leaf missing $type', () => {
    const invalid = loadAdapterFixture('invalid-ambiguous.json') as { dtcgMissingType: unknown };
    expect(detectFormat(invalid.dtcgMissingType)).toBeNull();
  });

  it('does not classify canonical TokensV1 as legacy or dtcg', () => {
    const canonical: TokensV1 = {
      v: 1,
      kind: 'tokens',
      collections: [{ id: 'primitives', modes: ['Default'] }],
      tokens: [],
    };
    expect(detectFormat(canonical)).toBeNull();
  });
});
