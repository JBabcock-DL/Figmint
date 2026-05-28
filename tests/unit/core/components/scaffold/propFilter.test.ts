import { describe, expect, it } from 'vitest';

import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';

import chipFixture from '@/core/components/scaffold/__fixtures__/component-spec-button-chip.v1.json';
import {
  DOC_ONLY_PROP_NAMES,
  buildImplicitPropPlan,
  filterPropsForApply,
} from '@/core/components/scaffold/propFilter';

describe('propFilter', () => {
  const chipSpec = chipFixture as ComponentSpecV1;

  it('exports doc-only skip list', () => {
    expect(DOC_ONLY_PROP_NAMES).toContain('className');
    expect(DOC_ONLY_PROP_NAMES).toContain('asChild');
  });

  it('dedupes matrix axis props and skips number/enum', () => {
    const spec: ComponentSpecV1 = {
      ...chipSpec,
      props: [
        { name: 'variant', type: 'enum', enum: ['default'] },
        { name: 'loading', type: 'boolean', default: false },
        { name: 'count', type: 'number', default: 1 },
        { name: 'className', type: 'string', default: '' },
        { name: 'loading', type: 'boolean', default: true },
      ],
    };

    const filtered = filterPropsForApply(spec);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('loading');
    expect(filtered[0].default).toBe(false);
  });

  it('builds implicit Label and icon props when flags set', () => {
    const plans = buildImplicitPropPlan(chipSpec);
    const displayNames = plans.map(function mapDisplay(plan) {
      return plan.displayName;
    });
    expect(displayNames).toContain('Label');
    expect(displayNames).toContain('Leading icon');
    expect(displayNames).toContain('Trailing icon');
  });

  it('skips implicit Label when explicit label prop exists', () => {
    const spec: ComponentSpecV1 = {
      ...chipSpec,
      props: [{ name: 'label', type: 'string', default: 'Go' }],
    };
    const plans = buildImplicitPropPlan(spec);
    const hasLabel = plans.some(function hasLabelPlan(plan) {
      return plan.logicalName === 'label';
    });
    expect(hasLabel).toBe(false);
  });
});
