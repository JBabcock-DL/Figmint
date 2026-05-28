import { beforeEach, describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { scaffold } from '@/core/components/scaffold';
import {
  PLUGIN_DATA_SCAFFOLD_ID,
  PLUGIN_DATA_SPEC_VERSION,
} from '@/core/components/scaffold/types';
import { parseVariantName } from '@/core/components/scaffold/variantMatrix';

import matrixSpec from '../../../../fixtures/component-spec/chip-button-3x2x2.v1.json';

import {
  MockComponentSet,
  MockPage,
  asPageNode,
  createMockPage,
  installMockFigmaScaffold,
} from './__mocks__/figmaScaffold';

// SPK-022-1: 3×2×2 combineAsVariants matrix — covered by this integration suite.
describe('scaffold integration', () => {
  let page: MockPage;

  beforeEach(() => {
    installMockFigmaScaffold();
    page = createMockPage();
  });

  it('scaffolds chip-button-3x2x2 into 12 parseable variants', async () => {
    const spec = matrixSpec as ComponentSpecV1;
    const result = await scaffold(spec, asPageNode(page));

    expect(result.variantCount).toBe(12);
    expect(result.replacedExisting).toBe(false);
    expect(result.unresolvedTokens).toEqual([]);

    const set = result.componentSet as unknown as MockComponentSet;
    expect(set.name).toBe('Button — ComponentSet');
    expect(set.getPluginData(PLUGIN_DATA_SCAFFOLD_ID)).toBe(result.scaffoldId);
    expect(set.getPluginData(PLUGIN_DATA_SPEC_VERSION)).toBe('1');
    expect(set.layoutWrap).toBe('WRAP');

    for (let i = 0; i < set.children.length; i++) {
      const child = set.children[i];
      const parsed = parseVariantName(child.name);
      expect(parsed).not.toBeNull();
      if (parsed !== null) {
        const keys = Object.keys(parsed).sort();
        expect(keys).toEqual(['disabled', 'size', 'variant']);
        expect(child.name).toBe(
          'disabled=' +
            String(parsed.disabled) +
            ', size=' +
            String(parsed.size) +
            ', variant=' +
            String(parsed.variant),
        );
      }
    }

    expect(set.children[0].name).toBe('disabled=false, size=sm, variant=a');

    const lookupKey = 'disabled=false, size=sm, variant=a';
    expect(result.variantByKey[lookupKey]).toBeDefined();
    expect(result.variantByKey[lookupKey].name).toBe(lookupKey);

    const auditIds = result.auditRows.map((row) => row.ruleId);
    expect(auditIds).toContain('comp/scaffold-variant-count');
    expect(auditIds).toContain('comp/scaffold-naming');
    expect(auditIds).toContain('comp/scaffold-one-px-master');
    expect(result.auditRows.every((row) => row.pass)).toBe(true);

    let stagingOrphans = 0;
    for (let i = 0; i < page.children.length; i++) {
      if (page.children[i].name.indexOf('_ccVariantBuild/') === 0) {
        stagingOrphans += 1;
      }
    }
    expect(stagingOrphans).toBe(0);
  });
});
