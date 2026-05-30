import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { getImportTemplate } from '@/core/import/registry';
import { createNotImplementedTokenResolver } from '@/core/import/shared/tokenResolver';
import { createCanonicalButtonTokenResolver } from '../../../mocks/tokenResolverCanonical';

const sandboxButton = readFileSync(
  resolve(__dirname, '../../../fixtures/sandbox-import/components/ui/button.tsx'),
  'utf8',
);

const goldenSpec = JSON.parse(
  readFileSync(resolve(__dirname, '../../../fixtures/component-spec-button-canonical.json'), 'utf8'),
) as { name: string; variantMatrix: Record<string, string[]>; props: { name: string }[] };

describe('sandbox-import button.tsx', () => {
  it('parses to canonical Button spec shape', () => {
    const template = getImportTemplate('react');
    expect(template).not.toBeNull();

    const result = template!.parse({
      sourcePath: 'tests/fixtures/sandbox-import/components/ui/button.tsx',
      sourceText: sandboxButton,
      tokenResolver: createCanonicalButtonTokenResolver(),
      registryKeys: ['button', 'icon'],
    });

    expect(result.spec.name).toBe(goldenSpec.name);
    expect(result.spec.variantMatrix).toEqual(goldenSpec.variantMatrix);

    const propNames = result.spec.props.map(function (p) {
      return p.name;
    });
    for (let i = 0; i < goldenSpec.props.length; i++) {
      expect(propNames).toContain(goldenSpec.props[i].name);
    }
  });

  it('does not require figma mapping file', () => {
    const template = getImportTemplate('react');
    const result = template!.parse({
      sourcePath: 'components/ui/button.tsx',
      sourceText: sandboxButton,
      tokenResolver: createNotImplementedTokenResolver(),
      registryKeys: [],
    });
    expect(result.spec.name).toBe('Button');
  });
});
