import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ReactImportTemplate } from '@/core/import';

import canonical from '../../../../fixtures/component-spec-button-canonical.json';
import { createCanonicalButtonTokenResolver } from '../../../../mocks/tokenResolverCanonical';

const buttonSource = readFileSync(resolve(__dirname, '../../../../fixtures/sources/button.tsx'), 'utf8');

describe('ReactImportTemplate golden parse', () => {
  it('parses shadcn Button → canonical ComponentSpecV1', () => {
    const result = new ReactImportTemplate().parse({
      sourcePath: 'components/ui/button.tsx',
      sourceText: buttonSource,
      tokenResolver: createCanonicalButtonTokenResolver(),
      registryKeys: [],
    });

    expect(result.spec.variantMatrix).toEqual(canonical.variantMatrix);
    expect(result.spec.props).toEqual(canonical.props);
    expect(result.spec.bindings).toEqual(canonical.bindings);
    expect(result.spec.layout).toEqual(canonical.layout);
    expect(result.spec.componentProps).toEqual(canonical.componentProps);
    expect(result.spec.iconSlots).toEqual(canonical.iconSlots);
    expect(result.spec.archetype).toBe('chip');
    expect(result.spec.framework).toBe('react');
    expect(result.spec.name).toBe('Button');
    expect(result.spec.confidence?.bindings).toBe('high');
    expect(Object.keys(result.spec.variantMatrix)).not.toContain('state');
  });
});
