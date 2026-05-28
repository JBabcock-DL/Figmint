import { describe, expect, it } from 'vitest';

import {
  coerceBooleanDefault,
  coerceTextDefault,
  mapSpecPropToFigma,
} from '@/core/components/scaffold/propTypeMap';

describe('propTypeMap', () => {
  it('maps boolean props with default coercion', () => {
    const mapped = mapSpecPropToFigma({ name: 'loading', type: 'boolean', default: false });
    expect(mapped).toEqual({ figmaType: 'BOOLEAN', defaultValue: false });
    expect(coerceBooleanDefault('true')).toBe(true);
    expect(coerceBooleanDefault(undefined)).toBe(false);
  });

  it('maps string props with text default coercion', () => {
    const mapped = mapSpecPropToFigma({ name: 'label', type: 'string', default: 'Click' });
    expect(mapped).toEqual({ figmaType: 'TEXT', defaultValue: 'Click' });
    expect(coerceTextDefault(undefined)).toBe('');
  });

  it('maps node props to INSTANCE_SWAP when id resolved', () => {
    const mapped = mapSpecPropToFigma(
      { name: 'icon', type: 'node' },
      'component:123',
    );
    expect(mapped).toEqual({ figmaType: 'INSTANCE_SWAP', defaultValue: 'component:123' });
  });

  it('returns null for node without resolved id and number type', () => {
    expect(mapSpecPropToFigma({ name: 'icon', type: 'node' })).toBeNull();
    expect(mapSpecPropToFigma({ name: 'count', type: 'number', default: 1 })).toBeNull();
  });
});
