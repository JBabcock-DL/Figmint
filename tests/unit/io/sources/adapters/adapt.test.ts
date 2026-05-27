import { describe, expect, it } from 'vitest';

import { adapt } from '@/io/sources/adapters';
import type { TokensV1 } from '@detroitlabs/figmint-contracts';

import { loadAdapterFixture } from './helpers';

describe('adapt', () => {
  it('passes through canonical TokensV1', () => {
    const canonical: TokensV1 = {
      v: 1,
      kind: 'tokens',
      collections: [{ id: 'primitives', modes: ['Default'] }],
      tokens: [
        {
          collection: 'primitives',
          name: 'color/brand',
          type: 'COLOR',
          valuesByMode: { Default: { r: 0, g: 0.33, b: 1, a: 1 } },
        },
      ],
    };
    const result = adapt(canonical);
    expect(result).toEqual({
      v: 1,
      kind: 'tokens',
      collections: [{ id: 'primitives', modes: ['Default'] }],
      tokens: [
        {
          collection: 'primitives',
          name: 'color/brand',
          type: 'COLOR',
          valuesByMode: { Default: { r: 0, g: 0.33, b: 1, a: 1 } },
        },
      ],
    });
  });

  it('returns FormatError for unrecognized wire format', () => {
    const invalid = loadAdapterFixture('invalid-ambiguous.json') as { emptyObject: unknown };
    const result = adapt(invalid.emptyObject);
    expect(result).toEqual({ kind: 'format-error', message: 'Unrecognized token wire format' });
  });

  it('adapts legacy and dtcg fixtures to TokensV1', () => {
    const legacy = adapt(loadAdapterFixture('legacy-foundations-min.json'));
    const dtcg = adapt(loadAdapterFixture('dtcg-foundations-min.json'));
    expect('kind' in legacy && legacy.kind === 'tokens').toBe(true);
    expect('kind' in dtcg && dtcg.kind === 'tokens').toBe(true);
  });
});
