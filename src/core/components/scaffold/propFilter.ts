import type { ComponentSpecProp, ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

export const DOC_ONLY_PROP_NAMES: readonly string[] = [
  'className',
  'class',
  'style',
  'asChild',
  'type',
  'ref',
  'key',
  'children',
];

export interface ImplicitPropPlan {
  logicalName: string;
  displayName: string;
  figmaType: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP';
  defaultValue: string | boolean;
  bindKey: string;
}

function isMatrixAxis(spec: ComponentSpecV1, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(spec.variantMatrix, name);
}

function hasExplicitLabelProp(props: ComponentSpecProp[]): boolean {
  for (let i = 0; i < props.length; i++) {
    if (props[i].name === 'label') {
      return true;
    }
  }
  return false;
}

export function filterPropsForApply(spec: ComponentSpecV1): ComponentSpecProp[] {
  const seen: Record<string, boolean> = {};
  const filtered: ComponentSpecProp[] = [];

  for (let i = 0; i < spec.props.length; i++) {
    const prop = spec.props[i];
    if (DOC_ONLY_PROP_NAMES.indexOf(prop.name) >= 0) {
      continue;
    }
    if (isMatrixAxis(spec, prop.name)) {
      continue;
    }
    if (prop.type === 'number' || prop.type === 'enum') {
      continue;
    }
    if (seen[prop.name]) {
      continue;
    }
    seen[prop.name] = true;
    filtered.push(prop);
  }

  return filtered;
}

export function buildImplicitPropPlan(spec: ComponentSpecV1): ImplicitPropPlan[] {
  const plans: ImplicitPropPlan[] = [];
  const componentProps = spec.componentProps;
  const iconSlots = spec.iconSlots;

  const labelFlag =
    componentProps !== undefined &&
    componentProps.label === true &&
    !hasExplicitLabelProp(spec.props);

  if (labelFlag) {
    plans.push({
      logicalName: 'label',
      displayName: 'Label',
      figmaType: 'TEXT',
      defaultValue: spec.name,
      bindKey: 'label',
    });
  }

  const leadingIconFlag =
    componentProps !== undefined &&
    componentProps.leadingIcon === true &&
    iconSlots !== undefined &&
    iconSlots.leading === true;

  if (leadingIconFlag) {
    plans.push({
      logicalName: 'leadingIcon',
      displayName: 'Leading icon',
      figmaType: 'BOOLEAN',
      defaultValue: true,
      bindKey: 'leadingIcon',
    });
  }

  const trailingIconFlag =
    componentProps !== undefined &&
    componentProps.trailingIcon === true &&
    iconSlots !== undefined &&
    iconSlots.trailing === true;

  if (trailingIconFlag) {
    plans.push({
      logicalName: 'trailingIcon',
      displayName: 'Trailing icon',
      figmaType: 'BOOLEAN',
      defaultValue: false,
      bindKey: 'trailingIcon',
    });
  }

  return plans;
}
