import { describe, expect, it } from 'vitest';

import { extractBindings } from '@/core/import/templates/react/extractBindings';
import { createCanonicalButtonTokenResolver } from '../../../../mocks/tokenResolverCanonical';

describe('extractBindings', () => {
  it('yields 8 canonical bindings with mocked resolver', () => {
    const tokens = [
      'inline-flex',
      'gap-2',
      'rounded-md',
      'px-4',
      'bg-primary',
      'text-primary-foreground',
      'hover:bg-primary/90',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
    ];
    const result = extractBindings(tokens, createCanonicalButtonTokenResolver());
    expect(result.bindings).toHaveLength(8);
    expect(result.unresolvedTokens).toEqual([]);
    expect(result.bindings).toEqual(
      expect.arrayContaining([
        { selector: 'root.fill', variable: 'color/primary/default' },
        { selector: 'root.radius', variable: 'radius/md' },
        { selector: 'root.padding', variable: 'space/md' },
        { selector: 'root.gap', variable: 'space/sm' },
        { selector: 'text/label.fill', variable: 'color/primary/content' },
        { selector: 'icon-slot/leading.fill', variable: 'color/primary/content' },
        { selector: 'state-layer/hover.fill', variable: 'color/primary/subtle' },
        { selector: 'focus-ring.stroke', variable: 'color/neutral/500' },
      ]),
    );
  });

  it('tracks unresolved arbitrary values', () => {
    const result = extractBindings(['bg-[#fff]'], createCanonicalButtonTokenResolver());
    expect(result.unresolvedTokens).toContain('bg-[#fff]');
  });
});
