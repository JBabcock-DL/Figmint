import { describe, expect, it } from 'vitest';

import type { RegistryV1 } from '@detroitlabs/fighub-contracts';

import { collectRegistryKeys } from '@/core/import/shared/collectRegistryKeys';

function makeRegistry(keys: string[]): RegistryV1 {
  const components: RegistryV1['components'] = {};
  for (let i = 0; i < keys.length; i++) {
    components[keys[i]] = {
      nodeId: '1:1',
      key: keys[i],
      pageName: 'Components',
      publishedAt: '2026-01-01T00:00:00.000Z',
      version: 1,
    };
  }
  return {
    v: 1,
    kind: 'registry',
    fileKey: 'abc',
    components: components,
  };
}

describe('collectRegistryKeys', () => {
  it('dedupes overlapping keys and sorts', () => {
    const canvas = makeRegistry(['Icon', 'Box']);
    const repo = makeRegistry(['Box', 'Chip']);
    expect(collectRegistryKeys(canvas, repo)).toEqual(['Box', 'Chip', 'Icon']);
  });

  it('handles both registries null', () => {
    expect(collectRegistryKeys(null, null)).toEqual([]);
  });
});
