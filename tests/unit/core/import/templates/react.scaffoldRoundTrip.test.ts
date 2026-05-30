import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { scaffold } from '@/core/components/scaffold';
import { ReactImportTemplate } from '@/core/import';
import { expectedVariantCount } from '@/core/components/scaffold/variantMatrix';

import { createCanonicalButtonTokenResolver } from '../../../../mocks/tokenResolverCanonical';

import {
  MockPage,
  asPageNode,
  createMockPage,
  installMockFigmaScaffold,
} from '../../components/scaffold/__mocks__/figmaScaffold';

const buttonSource = readFileSync(resolve(__dirname, '../../../../fixtures/sources/button.tsx'), 'utf8');

describe('ReactImportTemplate scaffold round-trip', () => {
  let page: MockPage;

  beforeEach(() => {
    installMockFigmaScaffold();
    page = createMockPage();
  });

  it('parse → scaffold yields 24 variants', async () => {
    const parseResult = new ReactImportTemplate().parse({
      sourcePath: 'components/ui/button.tsx',
      sourceText: buttonSource,
      tokenResolver: createCanonicalButtonTokenResolver(),
      registryKeys: [],
    });

    const spec = parseResult.spec as ComponentSpecV1;
    expect(expectedVariantCount(spec.variantMatrix)).toBe(24);

    const result = await scaffold(spec, asPageNode(page));
    expect(result.variantCount).toBe(24);
    expect(result.unresolvedTokens).toEqual([]);
  });
});
