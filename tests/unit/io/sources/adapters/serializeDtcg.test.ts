import { describe, expect, it } from 'vitest';

import { adapt } from '@/io/sources/adapters';
import { serializeDTCG } from '@/io/sources/adapters/serializeDtcg';
import type { TokensV1, TokensV1WC3DTCG } from '@detroitlabs/fighub-contracts';

import { loadAdapterFixture, normalizeJson } from './helpers';

describe('serializeDTCG', () => {
  it('round-trips roundtrip-dtcg-a fixture', () => {
    const input = loadAdapterFixture('roundtrip-dtcg-a.json') as TokensV1WC3DTCG;
    const canonical = adapt(input);
    expect('kind' in canonical && canonical.kind === 'tokens').toBe(true);
    const serialized = serializeDTCG(canonical as TokensV1);
    expect(normalizeJson(serialized)).toEqual(normalizeJson(input));
  });
});
