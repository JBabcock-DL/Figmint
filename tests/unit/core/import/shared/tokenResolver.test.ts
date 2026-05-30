import { describe, expect, it } from 'vitest';

import { createNotImplementedTokenResolver } from '@/core/import';

describe('tokenResolver stub', () => {
  it('createNotImplementedTokenResolver always returns unresolved', () => {
    const resolver = createNotImplementedTokenResolver();
    expect(resolver.resolve('bg-primary')).toEqual({ ok: false, reason: 'unresolved' });
    expect(resolver.resolve('anything')).toEqual({ ok: false, reason: 'unresolved' });
  });
});
