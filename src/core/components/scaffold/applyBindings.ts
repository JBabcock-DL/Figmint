import type { ComponentSpecV1 } from '@detroitlabs/figmint-contracts';

import { bindPaintToVar, bindStrokeToVar } from '@/core/canvas/helpers/bindings';
import { ensureLocalVariableMap, resolvePath } from '@/core/canvas/lib/variables';
import type { VariablePathMap } from '@/core/canvas/lib/variables';
import { pluginLog } from '@/core/pluginLog';

import { bindGapToVar, bindPaddingToVar, bindRadiusToVar } from './bindNumeric';
import {
  normalizeVariablePath,
  parseBindingSelector,
  resolveNodeByPath,
  validateKindForNode,
} from './selector';
import { applyTextStyleByName } from './textStyleBinding';
import type {
  ApplyBindingsOptions,
  ApplyBindingsResult,
  BindingFailure,
  BindingKind,
} from './types';

export { normalizeVariablePath, parseBindingSelector } from './selector';

function pushFailure(
  failed: BindingFailure[],
  selector: string,
  variable: string,
  reason: BindingFailure['reason'],
  diagnostic: string,
): void {
  failed.push({
    selector: selector,
    variable: variable,
    reason: reason,
    diagnostic: diagnostic,
  });
}

function assertColorVariable(variable: Variable): void {
  if (variable.resolvedType !== 'COLOR') {
    throw new Error('expected COLOR variable, got ' + variable.resolvedType);
  }
}

async function applyBindingToNode(
  node: SceneNode,
  kind: BindingKind,
  variable: Variable | null,
  styleName: string,
): Promise<void> {
  if (kind === 'fill') {
    if (variable === null) {
      throw new Error('missing variable for fill bind');
    }
    assertColorVariable(variable);
    bindPaintToVar(node as GeometryMixin & MinimalFillsMixin, variable);
    return;
  }
  if (kind === 'stroke') {
    if (variable === null) {
      throw new Error('missing variable for stroke bind');
    }
    assertColorVariable(variable);
    bindStrokeToVar(node as GeometryMixin & MinimalStrokesMixin, variable);
    return;
  }
  if (kind === 'padding') {
    if (variable === null) {
      throw new Error('missing variable for padding bind');
    }
    bindPaddingToVar(node as FrameNode, variable);
    return;
  }
  if (kind === 'gap') {
    if (variable === null) {
      throw new Error('missing variable for gap bind');
    }
    bindGapToVar(node as FrameNode, variable);
    return;
  }
  if (kind === 'radius') {
    if (variable === null) {
      throw new Error('missing variable for radius bind');
    }
    bindRadiusToVar(node as FrameNode, variable);
    return;
  }
  if (kind === 'text-style') {
    await applyTextStyleByName(node as TextNode, styleName);
  }
}

function countVariantComponents(componentSet: ComponentSetNode): number {
  let count = 0;
  for (let i = 0; i < componentSet.children.length; i++) {
    if (componentSet.children[i].type === 'COMPONENT') {
      count += 1;
    }
  }
  return count;
}

export async function applyBindings(
  spec: ComponentSpecV1,
  componentSet: ComponentSetNode,
  options?: ApplyBindingsOptions,
): Promise<ApplyBindingsResult> {
  const variantCount = countVariantComponents(componentSet);
  pluginLog(
    'applyBindings: ' +
      spec.name +
      ' bindings=' +
      String(spec.bindings.length) +
      ' variants=' +
      String(variantCount),
  );

  let map: VariablePathMap;
  if (options !== undefined && options.variableMap !== undefined) {
    map = options.variableMap;
  } else {
    map = await ensureLocalVariableMap();
  }

  const result: ApplyBindingsResult = { applied: 0, failed: [], passed: true };

  for (let v = 0; v < componentSet.children.length; v++) {
    const variant = componentSet.children[v];
    if (variant.type !== 'COMPONENT') {
      continue;
    }
    for (let b = 0; b < spec.bindings.length; b++) {
      const binding = spec.bindings[b];
      let parsed: { nodePath: string; kind: BindingKind };
      try {
        parsed = parseBindingSelector(binding.selector);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        pushFailure(result.failed, binding.selector, binding.variable, 'api-error', message);
        continue;
      }

      const target = resolveNodeByPath(variant, parsed.nodePath);
      if (target === null) {
        pushFailure(
          result.failed,
          binding.selector,
          binding.variable,
          'missing-node',
          'Missing node: ' + parsed.nodePath + ' (selector ' + binding.selector + ')',
        );
        continue;
      }

      const mismatch = validateKindForNode(target, parsed.kind);
      if (mismatch !== null) {
        pushFailure(
          result.failed,
          binding.selector,
          binding.variable,
          mismatch,
          'Type mismatch for ' + parsed.kind + ' on ' + target.type + ' (selector ' + binding.selector + ')',
        );
        continue;
      }

      if (parsed.kind === 'text-style') {
        try {
          await applyBindingToNode(target, parsed.kind, null, binding.variable);
          result.applied += 1;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          pushFailure(
            result.failed,
            binding.selector,
            binding.variable,
            'missing-variable',
            message + ' (selector ' + binding.selector + ')',
          );
        }
        continue;
      }

      const path = normalizeVariablePath(binding.variable);
      const variable = resolvePath(map, path);
      if (variable === null) {
        pushFailure(
          result.failed,
          binding.selector,
          binding.variable,
          'missing-variable',
          'Missing variable: ' + binding.variable + ' (selector ' + binding.selector + ')',
        );
        continue;
      }

      try {
        await applyBindingToNode(target, parsed.kind, variable, binding.variable);
        result.applied += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const reason =
          message.indexOf('expected FLOAT') >= 0 || message.indexOf('expected COLOR') >= 0
            ? 'type-mismatch'
            : 'api-error';
        pushFailure(result.failed, binding.selector, binding.variable, reason, message);
      }
    }
  }

  result.passed = result.failed.length === 0;
  if (!result.passed) {
    pluginLog('applyBindings: failed=' + String(result.failed.length));
  }
  return result;
}
