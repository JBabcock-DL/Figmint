import { describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import chipFixture from '@/core/components/scaffold/__fixtures__/component-spec-button-chip.v1.json';
import { applyProperties } from '@/core/components/scaffold/applyProperties';
import { runAudit } from '@/core/audit/runAudit';

import {
  asComponentSetNode,
  createMockComponentSetWithVariants,
} from './mockComponentSet';

describe('applyProperties integration', () => {
  const chipSpec = chipFixture as ComponentSpecV1;

  it('validates VARIANT axes without adding VARIANT properties', () => {
    const factory = createMockComponentSetWithVariants({
      variantCount: 2,
      variantMatrix: {
        variant: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
        size: ['sm', 'default', 'lg', 'icon'],
      },
    });

    const result = applyProperties(chipSpec, asComponentSetNode(factory.componentSet));

    expect(result.variantAxes.variant.ok).toBe(true);
    expect(result.variantAxes.size.ok).toBe(true);

    const variantAdds = factory.addPropertyCalls.filter(function isVariant(call) {
      return call.type === 'VARIANT';
    });
    expect(variantAdds).toHaveLength(0);
  });

  it('creates loading boolean and implicit label/icon props with bindings', () => {
    const factory = createMockComponentSetWithVariants({ variantCount: 1 });
    const result = applyProperties(chipSpec, asComponentSetNode(factory.componentSet));

    expect(result.propKeys.loading).toBe('loading#mock:0');
    expect(result.propKeys.label).toBe('Label#mock:0');
    expect(result.propKeys.leadingIcon).toBe('Leading icon#mock:0');
    expect(result.propKeys.trailingIcon).toBe('Trailing icon#mock:0');

    const loadingUnbound = factory.addPropertyCalls.some(function loadingCall(call) {
      return call.name === 'loading';
    });
    expect(loadingUnbound).toBe(true);

    const variant = factory.variants[0] as unknown as MockVariantWithRefs;
    const labelNode = findChildByName(variant, 'text/label') as MockVariantWithRefs | null;
    expect(labelNode).not.toBeNull();
    if (labelNode !== null) {
      expect(labelNode.componentPropertyReferences).toEqual({ characters: 'Label#mock:0' });
    }

    const leading = findChildByName(variant, 'icon-slot/leading') as MockVariantWithRefs | null;
    expect(leading).not.toBeNull();
    if (leading !== null) {
      expect(leading.componentPropertyReferences).toEqual({ visible: 'Leading icon#mock:0' });
    }
  });

  it('audit fails on all-variant prop failures and matrix mismatch', async () => {
    const factory = createMockComponentSetWithVariants({
      variantCount: 1,
      variantMatrix: { variant: ['wrong'] },
    });

    const failingResult = {
      ok: false,
      propKeys: {},
      variantAxes: {
        variant: { ok: false, expected: ['default'], actual: ['wrong'] },
      },
      failures: [{ variantName: 'v0', propName: 'loading', message: 'fail' }],
      implicitProps: [],
      bindWarnings: [],
    };

    const audit = await runAudit('component', {
      spec: chipSpec,
      componentSet: asComponentSetNode(factory.componentSet),
      applyPropertiesResult: failingResult,
    });

    expect(audit.passed).toBe(false);
    const failedRules = audit.results.filter(function failed(row) {
      return !row.pass;
    });
    const ruleIds = failedRules.map(function mapId(row) {
      return row.ruleId;
    });
    expect(ruleIds).toContain('comp/prop-add-zero-failures');
    expect(ruleIds).toContain('comp/variant-matrix-match');
  });
});

type MockVariantWithRefs = {
  name: string;
  children: unknown[];
  componentPropertyReferences?: Record<string, string>;
};

function findChildByName(node: MockVariantWithRefs, targetName: string): MockVariantWithRefs | null {
  if (node.name === targetName) {
    return node;
  }
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i] as MockVariantWithRefs;
    const found = findChildByName(child, targetName);
    if (found !== null) {
      return found;
    }
  }
  return null;
}
