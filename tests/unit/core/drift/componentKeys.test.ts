import { describe, expect, it } from 'vitest';

import { registryKeyFromSpecName, toComponentDriftId } from '@/core/drift/componentKeys';

describe('componentKeys', () => {
  it('maps Button to cmp/button drift id', () => {
    expect(toComponentDriftId('Button')).toBe('cmp/button');
    expect(registryKeyFromSpecName('Button')).toBe('Button');
  });
});
