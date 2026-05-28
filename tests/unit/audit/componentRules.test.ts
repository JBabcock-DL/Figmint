import { describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import chipFixture from '@/core/components/scaffold/__fixtures__/component-spec-button-chip.v1.json';
import { runAudit } from '@/core/audit/runAudit';
import { checkPropAddZeroFailures, checkVariantMatrixMatch } from '@/core/audit/rules/componentRules';

describe('componentRules audit', () => {
  const chipSpec = chipFixture as ComponentSpecV1;
  const mockSet = {} as ComponentSetNode;

  it('passes prop-add-zero-failures when no failures', () => {
    const rule = checkPropAddZeroFailures({
      spec: chipSpec,
      componentSet: mockSet,
      applyPropertiesResult: {
        ok: true,
        propKeys: { loading: 'loading#mock:0' },
        variantAxes: {},
        failures: [],
        implicitProps: [],
        bindWarnings: [],
      },
    });
    expect(rule.pass).toBe(true);
  });

  it('fails variant-matrix-match on axis drift', () => {
    const rule = checkVariantMatrixMatch({
      spec: chipSpec,
      componentSet: mockSet,
      applyPropertiesResult: {
        ok: true,
        propKeys: {},
        variantAxes: {
          variant: { ok: false, expected: ['default'], actual: ['wrong'] },
        },
        failures: [],
        implicitProps: [],
        bindWarnings: [],
      },
    });
    expect(rule.pass).toBe(false);
    expect(rule.ruleId).toBe('comp/variant-matrix-match');
  });

  it('runAudit component scope accepts applyPropertiesResult', async () => {
    const audit = await runAudit('component', {
      spec: chipSpec,
      componentSet: Object.assign({}, mockSet, { componentPropertyDefinitions: {} }),
      applyPropertiesResult: {
        ok: true,
        propKeys: {
          loading: 'loading#mock:0',
          label: 'Label#mock:0',
          leadingIcon: 'Leading icon#mock:0',
          trailingIcon: 'Trailing icon#mock:0',
        },
        variantAxes: {
          variant: {
            ok: true,
            expected: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
            actual: ['default'],
          },
          size: {
            ok: true,
            expected: ['sm', 'default', 'lg', 'icon'],
            actual: ['sm'],
          },
        },
        failures: [],
        implicitProps: ['Label'],
        bindWarnings: [],
      },
    });
    expect(audit.meta.scope).toBe('component');
    expect(audit.passed).toBe(true);
  });
});
