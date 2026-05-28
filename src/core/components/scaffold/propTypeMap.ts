import type { ComponentSpecProp } from '@detroitlabs/figmint-contracts';

export type FigmaPropType = 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP';

export interface MappedFigmaProp {
  figmaType: FigmaPropType;
  defaultValue: string | boolean;
}

export function coerceBooleanDefault(defaultValue?: string | number | boolean): boolean {
  if (defaultValue === undefined) {
    return false;
  }
  if (typeof defaultValue === 'boolean') {
    return defaultValue;
  }
  if (typeof defaultValue === 'number') {
    return defaultValue !== 0;
  }
  const normalized = String(defaultValue).toLowerCase();
  return normalized === 'true' || normalized === '1';
}

export function coerceTextDefault(defaultValue?: string | number | boolean): string {
  if (defaultValue === undefined) {
    return '';
  }
  return String(defaultValue);
}

export function mapSpecPropToFigma(
  prop: ComponentSpecProp,
  resolvedInstanceId?: string,
): MappedFigmaProp | null {
  if (prop.type === 'boolean') {
    return {
      figmaType: 'BOOLEAN',
      defaultValue: coerceBooleanDefault(prop.default),
    };
  }

  if (prop.type === 'string') {
    return {
      figmaType: 'TEXT',
      defaultValue: coerceTextDefault(prop.default),
    };
  }

  if (prop.type === 'node') {
    if (resolvedInstanceId === undefined || resolvedInstanceId.length === 0) {
      return null;
    }
    return {
      figmaType: 'INSTANCE_SWAP',
      defaultValue: resolvedInstanceId,
    };
  }

  return null;
}
