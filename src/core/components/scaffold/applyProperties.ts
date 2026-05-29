import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { pluginLog } from '@/core/pluginLog';

import { buildImplicitPropPlan, filterPropsForApply } from './propFilter';
import { resolvePropBinding, wireComponentPropertyReferences } from './propBindings';
import { mapSpecPropToFigma } from './propTypeMap';
import { listVariantComponents } from './listVariantComponents';
import type { ApplyPropertiesResult, PropApplyFailure } from './types';
import { validateVariantProperties } from './variantPropsValidate';

function emptyResult(partial?: Partial<ApplyPropertiesResult>): ApplyPropertiesResult {
  return {
    ok: partial !== undefined && partial.ok !== undefined ? partial.ok : true,
    propKeys: partial !== undefined && partial.propKeys !== undefined ? partial.propKeys : {},
    variantAxes:
      partial !== undefined && partial.variantAxes !== undefined ? partial.variantAxes : {},
    failures: partial !== undefined && partial.failures !== undefined ? partial.failures : [],
    implicitProps:
      partial !== undefined && partial.implicitProps !== undefined ? partial.implicitProps : [],
    bindWarnings:
      partial !== undefined && partial.bindWarnings !== undefined ? partial.bindWarnings : [],
  };
}

function recordPropSuccess(
  propKeys: Record<string, string>,
  logicalName: string,
  propKey: string,
): void {
  propKeys[logicalName] = propKey;
}

function countVariantSuccesses(
  failures: PropApplyFailure[],
  propName: string,
  variantCount: number,
): number {
  let failCount = 0;
  for (let i = 0; i < failures.length; i++) {
    if (failures[i].propName === propName) {
      failCount += 1;
    }
  }
  return variantCount - failCount;
}

function findDefinitionKey(
  definitions: ComponentPropertyDefinitions,
  displayOrLogicalName: string,
): string | null {
  const keys = Object.keys(definitions);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key === displayOrLogicalName || key.startsWith(displayOrLogicalName + '#')) {
      return key;
    }
  }
  return null;
}

function componentSetHasNonVariantProperties(componentSet: ComponentSetNode): boolean {
  const definitions = componentSet.componentPropertyDefinitions;
  if (definitions === undefined || definitions === null) {
    return false;
  }
  const keys = Object.keys(definitions);
  for (let i = 0; i < keys.length; i++) {
    const entry = definitions[keys[i]];
    if (entry !== undefined && entry.type !== 'VARIANT') {
      return true;
    }
  }
  return false;
}

function collectPropKeysFromDefinitions(
  componentSet: ComponentSetNode,
  spec: ComponentSpecV1,
): Record<string, string> {
  const definitions =
    componentSet.componentPropertyDefinitions !== undefined &&
    componentSet.componentPropertyDefinitions !== null
      ? componentSet.componentPropertyDefinitions
      : {};
  const propKeys: Record<string, string> = {};
  const filteredProps = filterPropsForApply(spec);

  for (let p = 0; p < filteredProps.length; p++) {
    const prop = filteredProps[p];
    const key = findDefinitionKey(definitions, prop.name);
    if (key !== null) {
      propKeys[prop.name] = key;
    }
  }

  const implicitPlans = buildImplicitPropPlan(spec);
  for (let p = 0; p < implicitPlans.length; p++) {
    const plan = implicitPlans[p];
    const key = findDefinitionKey(definitions, plan.displayName);
    if (key !== null) {
      propKeys[plan.logicalName] = key;
    }
  }

  return propKeys;
}

function computePropertiesOk(
  spec: ComponentSpecV1,
  variants: ComponentNode[],
  failures: PropApplyFailure[],
): boolean {
  const filteredProps = filterPropsForApply(spec);
  const implicitPlans = buildImplicitPropPlan(spec);
  const propNamesAttempted: string[] = [];
  for (let p = 0; p < filteredProps.length; p++) {
    if (mapSpecPropToFigma(filteredProps[p]) !== null) {
      propNamesAttempted.push(filteredProps[p].name);
    }
  }
  for (let p = 0; p < implicitPlans.length; p++) {
    propNamesAttempted.push(implicitPlans[p].displayName);
  }

  for (let i = 0; i < propNamesAttempted.length; i++) {
    const propName = propNamesAttempted[i];
    const successes = countVariantSuccesses(failures, propName, variants.length);
    if (successes === 0 && variants.length > 0) {
      return false;
    }
  }
  return true;
}

/**
 * Legacy-proven timing — add BOOLEAN/TEXT/etc. on each variant **before** `combineAsVariants`.
 */
export function applyPropertiesToVariants(
  variants: ComponentNode[],
  spec: ComponentSpecV1,
): ApplyPropertiesResult {
  if (variants.length === 0) {
    return emptyResult();
  }

  const filteredProps = filterPropsForApply(spec);
  const implicitPlans = buildImplicitPropPlan(spec);
  const failures: PropApplyFailure[] = [];
  const propKeys: Record<string, string> = {};
  const bindWarnings: string[] = [];
  const implicitDisplayNames: string[] = [];

  for (let p = 0; p < implicitPlans.length; p++) {
    implicitDisplayNames.push(implicitPlans[p].displayName);
  }

  for (let v = 0; v < variants.length; v++) {
    const variant = variants[v];
    if (variant.remote) {
      return emptyResult({
        ok: false,
        failures: [
          {
            variantName: '*',
            propName: '*',
            message: 'read-only library component',
          },
        ],
      });
    }

    for (let p = 0; p < filteredProps.length; p++) {
      const prop = filteredProps[p];
      const mapped = mapSpecPropToFigma(prop);
      if (mapped === null) {
        continue;
      }

      try {
        const propKey = variant.addComponentProperty(
          prop.name,
          mapped.figmaType,
          mapped.defaultValue,
        );
        recordPropSuccess(propKeys, prop.name, propKey);

        const binding = resolvePropBinding(prop.name);
        if (binding !== null) {
          const wired = wireComponentPropertyReferences(variant, propKey, binding);
          if (!wired.ok) {
            bindWarnings.push(
              variant.name +
                ': ' +
                prop.name +
                ' — ' +
                (wired.reason !== undefined ? wired.reason : 'bind failed'),
            );
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        pluginLog('[applyProperties] prop add failed', {
          variant: variant.name,
          prop: prop.name,
          message: message,
        });
        failures.push({
          variantName: variant.name,
          propName: prop.name,
          message: message,
        });
      }
    }

    for (let p = 0; p < implicitPlans.length; p++) {
      const plan = implicitPlans[p];
      try {
        const propKey = variant.addComponentProperty(
          plan.displayName,
          plan.figmaType,
          plan.defaultValue,
        );
        recordPropSuccess(propKeys, plan.logicalName, propKey);

        const binding = resolvePropBinding(plan.bindKey);
        if (binding !== null) {
          const wired = wireComponentPropertyReferences(variant, propKey, binding);
          if (!wired.ok) {
            bindWarnings.push(
              variant.name +
                ': ' +
                plan.displayName +
                ' — ' +
                (wired.reason !== undefined ? wired.reason : 'bind failed'),
            );
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        pluginLog('[applyProperties] implicit prop add failed', {
          variant: variant.name,
          prop: plan.displayName,
          message: message,
        });
        failures.push({
          variantName: variant.name,
          propName: plan.displayName,
          message: message,
        });
      }
    }
  }

  return {
    ok: computePropertiesOk(spec, variants, failures),
    propKeys: propKeys,
    variantAxes: {},
    failures: failures,
    implicitProps: implicitDisplayNames,
    bindWarnings: bindWarnings,
  };
}

export function applyProperties(
  spec: ComponentSpecV1,
  componentSet: ComponentSetNode,
): ApplyPropertiesResult {
  if (componentSet.remote) {
    return emptyResult({
      ok: false,
      failures: [
        {
          variantName: '*',
          propName: '*',
          message: 'read-only library component',
        },
      ],
    });
  }

  const variants = listVariantComponents(componentSet);
  const implicitPlans = buildImplicitPropPlan(spec);
  const implicitDisplayNames: string[] = [];
  for (let p = 0; p < implicitPlans.length; p++) {
    implicitDisplayNames.push(implicitPlans[p].displayName);
  }

  let result: ApplyPropertiesResult;
  if (componentSetHasNonVariantProperties(componentSet)) {
    pluginLog('[applyProperties] validate-only — properties defined pre-combine');
    result = {
      ok: true,
      propKeys: collectPropKeysFromDefinitions(componentSet, spec),
      variantAxes: {},
      failures: [],
      implicitProps: implicitDisplayNames,
      bindWarnings: [],
    };
  } else {
    result = applyPropertiesToVariants(variants, spec);
  }

  result.variantAxes = validateVariantProperties(componentSet, spec.variantMatrix);
  return result;
}

export type { ApplyPropertiesResult, PropApplyFailure } from './types';
