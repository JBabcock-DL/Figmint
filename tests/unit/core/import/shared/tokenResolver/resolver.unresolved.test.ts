import { describe, expect, it } from 'vitest';

import { createTokenResolver } from '@/core/import/shared/tokenResolver';

describe('createTokenResolver unresolved', () => {
  it('returns unresolved for unknown class fragments', () => {
    const resolver = createTokenResolver({
      repoUrl: 'https://github.com/acme/demo',
      classToVariable: { 'bg-primary': 'color/primary/default' },
    });
    expect(resolver.resolve('bg-mystery')).toEqual({ ok: false, reason: 'unresolved' });
  });
});
