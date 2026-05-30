import { describe, expect, it } from 'vitest';

import { createTokenResolver } from '@/core/import/shared/tokenResolver';

describe('manual override wins', () => {
  it('prefers manualMap over auto-detected class map', () => {
    const resolver = createTokenResolver({
      repoUrl: 'https://github.com/acme/demo',
      manualMap: { 'bg-primary': 'color/destructive/default' },
      classToVariable: { 'bg-primary': 'color/primary/default' },
    });
    expect(resolver.resolve('bg-primary')).toEqual({
      ok: true,
      variable: 'color/destructive/default',
    });
  });

  it('normalizes Theme/ prefix in manual override values', () => {
    const resolver = createTokenResolver({
      repoUrl: 'https://github.com/acme/demo',
      manualMap: { 'bg-primary': 'Theme/color/primary/default' },
    });
    expect(resolver.resolve('bg-primary')).toEqual({
      ok: true,
      variable: 'color/primary/default',
    });
  });
});
