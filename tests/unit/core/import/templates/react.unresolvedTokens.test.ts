import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { ReactImportTemplate } from '@/core/import';

import { createAlwaysUnresolvedResolver } from '../../../../mocks/tokenResolverCanonical';

const buttonSource = readFileSync(resolve(__dirname, '../../../../fixtures/sources/button.tsx'), 'utf8');

const sourceWithMuted = buttonSource.replace(
  'hover:bg-primary/90',
  'hover:bg-primary/90 bg-muted/40',
);

describe('ReactImportTemplate unresolved tokens', () => {
  it('marks confidence.bindings low for bg-muted/40', () => {
    const result = new ReactImportTemplate().parse({
      sourcePath: 'components/ui/button.tsx',
      sourceText: sourceWithMuted,
      tokenResolver: createAlwaysUnresolvedResolver('bg-muted/40'),
      registryKeys: [],
    });

    expect(result.spec.confidence?.bindings).toBe('low');
    expect(result.spec.confidence?.unresolved).toContain('bg-muted/40');
    expect(
      result.issues.some(function (issue) {
        return issue.code === 'unresolved-token';
      }),
    ).toBe(true);
  });
});
