import type { AuditRuleResult } from '@detroitlabs/fighub-contracts';

import { parseBindingSelector, resolveNodeByPath } from '@/core/components/scaffold/selector';
import type { ComponentAuditInput } from '@/core/components/scaffold/types';

function result(ruleId: string, pass: boolean, diagnostic: string): AuditRuleResult {
  return {
    ruleId: ruleId,
    pass: pass,
    diagnostic: diagnostic,
    severity: 'error',
  };
}

function firstVariantComponent(componentSet: ComponentSetNode): ComponentNode | null {
  for (let i = 0; i < componentSet.children.length; i++) {
    const child = componentSet.children[i];
    if (child.type === 'COMPONENT') {
      return child;
    }
  }
  return null;
}

function paintHasColorBind(paints: readonly Paint[] | PluginAPI['mixed']): boolean {
  if (!Array.isArray(paints) || paints.length === 0) {
    return false;
  }
  const first = paints[0] as SolidPaint & { boundVariables?: { color?: unknown } };
  if (first.boundVariables !== undefined && first.boundVariables.color !== undefined) {
    return true;
  }
  return false;
}

function nodeHasFieldBind(node: SceneNode, field: VariableBindableNodeField): boolean {
  if (!('boundVariables' in node)) {
    return false;
  }
  const bound = (node as { boundVariables?: Record<string, unknown> }).boundVariables;
  if (bound === undefined) {
    return false;
  }
  return bound[field] !== undefined;
}

function verifyBindingOnNode(
  node: SceneNode,
  kind: ReturnType<typeof parseBindingSelector>['kind'],
): boolean {
  if (kind === 'fill') {
    if ('fills' in node) {
      return paintHasColorBind((node as GeometryMixin).fills);
    }
    return false;
  }
  if (kind === 'stroke') {
    if ('strokes' in node) {
      return paintHasColorBind((node as GeometryMixin).strokes);
    }
    return false;
  }
  if (kind === 'padding') {
    return (
      nodeHasFieldBind(node, 'paddingLeft') &&
      nodeHasFieldBind(node, 'paddingRight') &&
      nodeHasFieldBind(node, 'paddingTop') &&
      nodeHasFieldBind(node, 'paddingBottom')
    );
  }
  if (kind === 'gap') {
    return nodeHasFieldBind(node, 'itemSpacing');
  }
  if (kind === 'radius') {
    return (
      nodeHasFieldBind(node, 'topLeftRadius') &&
      nodeHasFieldBind(node, 'topRightRadius') &&
      nodeHasFieldBind(node, 'bottomLeftRadius') &&
      nodeHasFieldBind(node, 'bottomRightRadius')
    );
  }
  if (kind === 'text-style') {
    if (node.type !== 'TEXT') {
      return false;
    }
    const textNode = node as TextNode;
    const styleId = textNode.textStyleId;
    if (typeof figma !== 'undefined' && styleId === figma.mixed) {
      return false;
    }
    return typeof styleId === 'string' && styleId.length > 0;
  }
  return false;
}

export function checkCompBindingsAllApplied(input: ComponentAuditInput): AuditRuleResult {
  if (input.bindingsResult === undefined) {
    return result('comp/bindings-all-applied', true, 'N/A — no bindingsResult');
  }
  const failedCount = input.bindingsResult.failed.length;
  const pass = failedCount === 0;
  return result(
    'comp/bindings-all-applied',
    pass,
    pass ? 'All bindings applied' : String(failedCount) + ' binding(s) failed',
  );
}

export function checkCompBindingVariableResolved(input: ComponentAuditInput): AuditRuleResult {
  if (input.bindingsResult === undefined) {
    return result('comp/binding-variable-resolved', true, 'N/A — no bindingsResult');
  }
  const missing: string[] = [];
  for (let i = 0; i < input.bindingsResult.failed.length; i++) {
    const failure = input.bindingsResult.failed[i];
    if (failure.reason === 'missing-variable') {
      missing.push(
        'Missing variable: ' + failure.variable + ' (selector ' + failure.selector + ')',
      );
    }
  }
  const pass = missing.length === 0;
  return result(
    'comp/binding-variable-resolved',
    pass,
    pass ? 'All binding variables resolved' : missing.join('; '),
  );
}

export function checkCompBindingNodeResolved(input: ComponentAuditInput): AuditRuleResult {
  if (input.bindingsResult === undefined) {
    return result('comp/binding-node-resolved', true, 'N/A — no bindingsResult');
  }
  const missing: string[] = [];
  for (let i = 0; i < input.bindingsResult.failed.length; i++) {
    const failure = input.bindingsResult.failed[i];
    if (failure.reason === 'missing-node') {
      let nodePath = failure.selector;
      try {
        nodePath = parseBindingSelector(failure.selector).nodePath;
      } catch {
        // keep full selector
      }
      missing.push('Missing node: ' + nodePath + ' (selector ' + failure.selector + ')');
    }
  }
  const pass = missing.length === 0;
  return result(
    'comp/binding-node-resolved',
    pass,
    pass ? 'All binding node paths resolved' : missing.join('; '),
  );
}

export function checkCompBindingVerified(input: ComponentAuditInput): AuditRuleResult {
  if (input.bindingsResult === undefined) {
    return result('comp/binding-verified', true, 'N/A — no bindingsResult');
  }
  if (input.bindingsResult.failed.length > 0) {
    return result('comp/binding-verified', true, 'Skipped — binding failures present');
  }

  const variant = firstVariantComponent(input.componentSet);
  if (variant === null) {
    return result('comp/binding-verified', false, 'No variant components found');
  }

  const issues: string[] = [];
  for (let b = 0; b < input.spec.bindings.length; b++) {
    const binding = input.spec.bindings[b];
    let parsed: ReturnType<typeof parseBindingSelector>;
    try {
      parsed = parseBindingSelector(binding.selector);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      issues.push(binding.selector + ': parse error — ' + message);
      continue;
    }
    const target = resolveNodeByPath(variant, parsed.nodePath);
    if (target === null) {
      issues.push(
        binding.selector + ': expected bind on missing node, found none',
      );
      continue;
    }
    if (!verifyBindingOnNode(target, parsed.kind)) {
      issues.push(
        binding.selector + ': expected bind on ' + target.name + ', found none',
      );
    }
  }

  const pass = issues.length === 0;
  return result(
    'comp/binding-verified',
    pass,
    pass ? 'All bindings verified on first variant' : issues.join('; '),
  );
}

export const COMPONENT_BINDING_RULES: ((input: ComponentAuditInput) => AuditRuleResult)[] = [
  checkCompBindingsAllApplied,
  checkCompBindingVariableResolved,
  checkCompBindingNodeResolved,
  checkCompBindingVerified,
];

export function runComponentBindingRules(input: ComponentAuditInput): AuditRuleResult[] {
  if (input.bindingsResult === undefined) {
    return [];
  }
  const bindingInput: ComponentAuditInput = {
    spec: input.spec,
    componentSet: input.componentSet,
    bindingsResult: input.bindingsResult,
  };
  const results: AuditRuleResult[] = [];
  for (let i = 0; i < COMPONENT_BINDING_RULES.length; i++) {
    results.push(COMPONENT_BINDING_RULES[i](bindingInput));
  }
  return results;
}
