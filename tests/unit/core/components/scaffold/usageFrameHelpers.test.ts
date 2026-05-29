import { describe, expect, it } from 'vitest';

import {
  comboToSetProperties,
  formatVariantTupleLabel,
} from '@/core/components/scaffold/curateVariantCombos';

describe('usageFrame helper functions', () => {
  it('maps booleans to Figma setProperties strings', () => {
    expect(comboToSetProperties({ disabled: false, size: 'sm' }, ['disabled', 'size'])).toEqual({
      disabled: 'false',
      size: 'sm',
    });
  });

  it('maps boolean true to the string true in setProperties', () => {
    expect(comboToSetProperties({ disabled: true }, ['disabled'])).toEqual({ disabled: 'true' });
  });

  it('formats tuple labels in sorted axis order', () => {
    expect(
      formatVariantTupleLabel({ disabled: false, size: 'sm', variant: 'default' }, [
        'disabled',
        'size',
        'variant',
      ]),
    ).toBe('disabled=false, size=sm, variant=default');
  });

  it('uses lowercase true/false in label text', () => {
    expect(formatVariantTupleLabel({ disabled: true, size: 'md' }, ['disabled', 'size'])).toBe(
      'disabled=true, size=md',
    );
  });
});
