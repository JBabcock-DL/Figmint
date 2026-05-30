import { describe, expect, it } from 'vitest';

import { mapTsPropsToSpec } from '@/core/import';

describe('propTypeMapper stub', () => {
  it('maps boolean prop with coerceBooleanDefault', () => {
    const props = mapTsPropsToSpec({
      props: [{ name: 'disabled', tsType: 'boolean' }],
    });
    expect(props).toEqual([{ name: 'disabled', type: 'boolean', default: false }]);
  });

  it('maps string prop with coerceTextDefault', () => {
    const props = mapTsPropsToSpec({
      props: [{ name: 'className', tsType: 'string', defaultValue: 'foo' }],
    });
    expect(props).toEqual([{ name: 'className', type: 'string', default: 'foo' }]);
  });

  it('skips unknown tsType', () => {
    const props = mapTsPropsToSpec({
      props: [{ name: 'variant', tsType: 'VariantProps' }],
    });
    expect(props).toEqual([]);
  });
});
