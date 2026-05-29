import type { AuditRuleResult } from '@detroitlabs/fighub-contracts';

import { buildImplicitPropPlan, filterPropsForApply } from '@/core/components/scaffold/propFilter';
import type { ComponentAuditInput } from '@/core/components/scaffold/types';

function result(
  ruleId: string,
  pass: boolean,
  diagnostic: string,
  severity: 'error' | 'warn' = 'error',
): AuditRuleResult {
  return {
    ruleId: ruleId,
    pass: pass,
    diagnostic: diagnostic,
    severity: severity,
  };
}

function stripPropertySuffix(key: string): string {
  const hashIndex = key.indexOf('#');
  if (hashIndex >= 0) {
    return key.slice(0, hashIndex);
  }
  return key;
}

function hasPropertyDefinition(
  componentSet: ComponentSetNode,
  displayName: string,
  type: 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT',
): boolean {
  const defs = componentSet.componentPropertyDefinitions;
  if (defs === undefined || defs === null) {
    return false;
  }
  const keys = Object.keys(defs);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const def = defs[key];
    if (def.type === type && stripPropertySuffix(key) === displayName) {
      return true;
    }
  }
  return false;
}

function requirePropsResult(
  input: ComponentAuditInput,
): NonNullable<ComponentAuditInput['applyPropertiesResult']> | null {
  if (input.applyPropertiesResult === undefined) {
    return null;
  }
  return input.applyPropertiesResult;
}

function checkPropLabelText(input: ComponentAuditInput): AuditRuleResult {
  const propsResult = requirePropsResult(input);
  if (propsResult === null) {
    return result('comp/prop-label-text', true, 'N/A — no applyPropertiesResult');
  }

  const implicitPlans = buildImplicitPropPlan(input.spec);
  let labelPlanned = false;
  for (let i = 0; i < implicitPlans.length; i++) {
    if (implicitPlans[i].logicalName === 'label') {
      labelPlanned = true;
      break;
    }
  }

  const filtered = filterPropsForApply(input.spec);
  for (let i = 0; i < filtered.length; i++) {
    if (filtered[i].name === 'label' && filtered[i].type === 'string') {
      labelPlanned = true;
      break;
    }
  }

  if (!labelPlanned) {
    return result('comp/prop-label-text', true, 'N/A — no Label prop planned');
  }

  const pass =
    propsResult.propKeys.label !== undefined ||
    hasPropertyDefinition(input.componentSet, 'Label', 'TEXT');

  return result(
    'comp/prop-label-text',
    pass,
    pass ? 'Label TEXT property present' : 'Label TEXT property missing',
  );
}

function checkPropLeadingIconBoolean(input: ComponentAuditInput): AuditRuleResult {
  const propsResult = requirePropsResult(input);
  if (propsResult === null) {
    return result('comp/prop-leading-icon-boolean', true, 'N/A — no applyPropertiesResult');
  }

  const componentProps = input.spec.componentProps;
  const iconSlots = input.spec.iconSlots;
  const planned =
    componentProps !== undefined &&
    componentProps.leadingIcon === true &&
    iconSlots !== undefined &&
    iconSlots.leading === true;

  if (!planned) {
    return result('comp/prop-leading-icon-boolean', true, 'N/A — leading icon flags not set');
  }

  const pass =
    propsResult.propKeys.leadingIcon !== undefined ||
    hasPropertyDefinition(input.componentSet, 'Leading icon', 'BOOLEAN');

  return result(
    'comp/prop-leading-icon-boolean',
    pass,
    pass ? 'Leading icon BOOLEAN property present' : 'Leading icon BOOLEAN property missing',
  );
}

function checkPropTrailingIconBoolean(input: ComponentAuditInput): AuditRuleResult {
  const propsResult = requirePropsResult(input);
  if (propsResult === null) {
    return result('comp/prop-trailing-icon-boolean', true, 'N/A — no applyPropertiesResult');
  }

  const componentProps = input.spec.componentProps;
  const iconSlots = input.spec.iconSlots;
  const planned =
    componentProps !== undefined &&
    componentProps.trailingIcon === true &&
    iconSlots !== undefined &&
    iconSlots.trailing === true;

  if (!planned) {
    return result('comp/prop-trailing-icon-boolean', true, 'N/A — trailing icon flags not set');
  }

  const pass =
    propsResult.propKeys.trailingIcon !== undefined ||
    hasPropertyDefinition(input.componentSet, 'Trailing icon', 'BOOLEAN');

  return result(
    'comp/prop-trailing-icon-boolean',
    pass,
    pass ? 'Trailing icon BOOLEAN property present' : 'Trailing icon BOOLEAN property missing',
  );
}

function checkPropAddZeroFailures(input: ComponentAuditInput): AuditRuleResult {
  const propsResult = requirePropsResult(input);
  if (propsResult === null) {
    return result('comp/prop-add-zero-failures', true, 'N/A — no applyPropertiesResult');
  }

  const failures = propsResult.failures;
  if (failures.length === 0) {
    return result('comp/prop-add-zero-failures', true, 'No property add failures');
  }

  const pass = propsResult.ok;
  return result(
    'comp/prop-add-zero-failures',
    pass,
    pass
      ? 'Some variants failed but at least one variant succeeded per property'
      : String(failures.length) +
          ' property add failure(s); all variants failed for at least one prop',
  );
}

function checkVariantMatrixMatch(input: ComponentAuditInput): AuditRuleResult {
  const propsResult = requirePropsResult(input);
  if (propsResult === null) {
    return result('comp/variant-matrix-match', true, 'N/A — no applyPropertiesResult');
  }

  const axes = propsResult.variantAxes;
  const axisKeys = Object.keys(axes);
  const mismatches: string[] = [];

  for (let i = 0; i < axisKeys.length; i++) {
    const axis = axisKeys[i];
    if (!axes[axis].ok) {
      mismatches.push(axis);
    }
  }

  const pass = mismatches.length === 0;
  return result(
    'comp/variant-matrix-match',
    pass,
    pass
      ? 'All variant matrix axes match componentPropertyDefinitions'
      : 'Matrix mismatch on axes: ' + mismatches.join(', '),
  );
}

function checkPropBindTargetMissing(input: ComponentAuditInput): AuditRuleResult {
  const propsResult = requirePropsResult(input);
  if (propsResult === null) {
    return result('comp/prop-bind-target-missing', true, 'N/A — no applyPropertiesResult', 'warn');
  }

  const warnings = propsResult.bindWarnings;
  const pass = warnings.length === 0;
  return result(
    'comp/prop-bind-target-missing',
    pass,
    pass ? 'All binding targets resolved' : warnings.join('; '),
    'warn',
  );
}

export const COMPONENT_RULES: ((input: ComponentAuditInput) => AuditRuleResult)[] = [
  checkPropLabelText,
  checkPropLeadingIconBoolean,
  checkPropTrailingIconBoolean,
  checkPropAddZeroFailures,
  checkVariantMatrixMatch,
  checkPropBindTargetMissing,
];

export function runComponentRules(input: ComponentAuditInput): AuditRuleResult[] {
  const results: AuditRuleResult[] = [];
  for (let i = 0; i < COMPONENT_RULES.length; i++) {
    results.push(COMPONENT_RULES[i](input));
  }
  return results;
}

export {
  checkPropAddZeroFailures,
  checkPropBindTargetMissing,
  checkPropLabelText,
  checkPropLeadingIconBoolean,
  checkPropTrailingIconBoolean,
  checkVariantMatrixMatch,
};
