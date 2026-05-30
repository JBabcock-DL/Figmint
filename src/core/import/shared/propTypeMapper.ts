import type { ComponentSpecProp } from '@detroitlabs/fighub-contracts';

import {
  coerceBooleanDefault,
  coerceTextDefault,
} from '@/core/components/scaffold/propTypeMap';

export interface MapTsPropsToSpecOptions {
  /** Placeholder for WO-041 AST nodes — typed loosely until parser lands */
  props: readonly { name: string; tsType: string; defaultValue?: string | number | boolean }[];
}

/**
 * Stub for WO-041 — maps TS prop descriptors → ComponentSpecProp[].
 * Uses coerceBooleanDefault / coerceTextDefault from propTypeMap (research D6).
 */
export function mapTsPropsToSpec(options: MapTsPropsToSpecOptions): ComponentSpecProp[] {
  const result: ComponentSpecProp[] = [];
  for (let i = 0; i < options.props.length; i++) {
    const p = options.props[i];
    if (p.tsType === 'boolean') {
      result.push({
        name: p.name,
        type: 'boolean',
        default: coerceBooleanDefault(p.defaultValue),
      });
    } else if (p.tsType === 'string') {
      result.push({
        name: p.name,
        type: 'string',
        default: coerceTextDefault(p.defaultValue),
      });
    }
    // enum / node — WO-041 implements
  }
  return result;
}
