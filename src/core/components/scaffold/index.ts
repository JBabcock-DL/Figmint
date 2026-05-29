import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { resizeThenApplySizing } from '@/core/canvas/helpers/autoLayout';
import { pluginLog } from '@/core/pluginLog';

import type { ComponentScaffoldTarget } from './ensureComponentScaffoldTarget';

import { applyBindings } from './applyBindings';
import { applyProperties, applyPropertiesToVariants } from './applyProperties';
import { normalizeVariantMastersInSet } from './variantGeometry';
import { buildScaffoldAuditRows } from './auditRows';
import { buildDocPipeline } from '@/core/canvas/doc';
import { buildChipVariant } from './archetypes/chip';
import { buildComposedVariant } from './archetypes/composed';
import { buildContainerVariant } from './archetypes/container';
import { buildControlVariant } from './archetypes/control';
import { buildFieldVariant } from './archetypes/field';
import { buildRowItemVariant } from './archetypes/rowItem';
import { buildSurfaceStackVariant } from './archetypes/surfaceStack';
import { buildTinyVariant } from './archetypes/tiny';
import { projectBuildContext, resolveArchetypeRoute } from './specAdapter';
import {
  PLUGIN_DATA_SCAFFOLD_ID,
  PLUGIN_DATA_SPEC_VERSION,
  type ArchetypeBuilder,
  type ScaffoldOptions,
  type ScaffoldResult,
  type UsageFrameResult,
} from './types';
import {
  buildScaffoldId,
  expandVariantMatrix,
  expectedVariantCount,
  parseVariantName,
} from './variantMatrix';

const STAGING_PREFIX = '_ccVariantBuild/';

function validateSpec(spec: ComponentSpecV1): void {
  if (spec.v !== 1 || spec.kind !== 'component-spec') {
    throw new Error('scaffold: expected ComponentSpecV1 with v=1 and kind=component-spec');
  }
}

function resolveScaffoldParent(
  target: PageNode | ComponentScaffoldTarget,
): { page: PageNode; parent: ChildrenMixin & SceneNode } {
  if ('docRoot' in target) {
    return { page: target.page, parent: target.docRoot };
  }
  return { page: target, parent: target };
}

export function findExistingComponentSet(
  target: PageNode | ComponentScaffoldTarget,
  scaffoldId: string,
  displayTitle: string,
): ComponentSetNode | null {
  const expectedName = displayTitle + ' — ComponentSet';
  const page = 'docRoot' in target ? target.page : target;
  const nodes = page.findAll(function (node) {
    return node.type === 'COMPONENT_SET';
  });
  for (let i = 0; i < nodes.length; i++) {
    const set = nodes[i] as ComponentSetNode;
    const storedId = set.getPluginData(PLUGIN_DATA_SCAFFOLD_ID);
    if (storedId === scaffoldId) {
      return set;
    }
    if (set.name === expectedName) {
      return set;
    }
  }
  return null;
}

export function removeScaffoldArtifacts(
  target: PageNode | ComponentScaffoldTarget,
  displayTitle: string,
  docKey?: string,
): void {
  const page = 'docRoot' in target ? target.page : target;
  const stagingName = STAGING_PREFIX + displayTitle;
  for (let i = page.children.length - 1; i >= 0; i--) {
    const child = page.children[i];
    if (child.name === stagingName) {
      child.remove();
    }
  }

  if ('docRoot' in target && docKey !== undefined) {
    const legacyWrapper = displayTitle + '/forward-scaffold';
    for (let i = page.children.length - 1; i >= 0; i--) {
      const child = page.children[i];
      if (child.name === legacyWrapper) {
        child.remove();
      }
    }
    const children = [...target.docRoot.children];
    for (let ci = 0; ci < children.length; ci++) {
      children[ci].remove();
    }
  }
}

async function stageVariants(
  parent: ChildrenMixin & SceneNode,
  specName: string,
  components: ComponentNode[],
): Promise<FrameNode> {
  const holder = figma.createFrame();
  holder.name = STAGING_PREFIX + specName;
  holder.visible = false;
  holder.layoutMode = 'NONE';
  holder.resize(1, 1);
  parent.appendChild(holder);

  let cx = 0;
  for (let i = 0; i < components.length; i++) {
    const component = components[i];
    component.x = cx;
    component.y = 0;
    holder.appendChild(component);
    cx += component.width + 16;
  }
  return holder;
}

function finalizeComponentSet(
  componentSet: ComponentSetNode,
  displayTitle: string,
  scaffoldId: string,
): void {
  componentSet.name = displayTitle + ' — ComponentSet';
  componentSet.layoutMode = 'HORIZONTAL';
  componentSet.layoutWrap = 'WRAP';
  resizeThenApplySizing(componentSet as unknown as FrameNode, componentSet.width > 0 ? componentSet.width : 320, 1, {
    primaryAxisSizingMode: 'FIXED',
    counterAxisSizingMode: 'AUTO',
  });
  componentSet.setPluginData(PLUGIN_DATA_SCAFFOLD_ID, scaffoldId);
  componentSet.setPluginData(PLUGIN_DATA_SPEC_VERSION, '1');
}

export function buildVariantByKey(componentSet: ComponentSetNode): Record<string, ComponentNode> {
  const map: Record<string, ComponentNode> = {};
  for (let i = 0; i < componentSet.children.length; i++) {
    const child = componentSet.children[i];
    if (child.type !== 'COMPONENT') {
      continue;
    }
    const combo = parseVariantName(child.name);
    if (combo === null) {
      continue;
    }
    const keys = Object.keys(combo).sort();
    const parts: string[] = [];
    for (let k = 0; k < keys.length; k++) {
      const key = keys[k];
      const raw = combo[key];
      let val: string;
      if (typeof raw === 'boolean') {
        val = raw ? 'true' : 'false';
      } else {
        val = String(raw);
      }
      parts.push(key + '=' + val);
    }
    map[parts.join(', ')] = child as ComponentNode;
  }
  return map;
}

export function dispatchArchetypeBuilder(
  route: ReturnType<typeof resolveArchetypeRoute>,
): ArchetypeBuilder {
  if (route === 'chip') {
    return buildChipVariant;
  }
  if (route === 'surface-stack') {
    return buildSurfaceStackVariant;
  }
  if (route === 'field') {
    return buildFieldVariant;
  }
  if (route === 'row-item') {
    return buildRowItemVariant;
  }
  if (route === 'tiny') {
    return buildTinyVariant;
  }
  if (route === 'container') {
    return buildContainerVariant;
  }
  if (route === 'control') {
    return buildControlVariant;
  }
  if (route === 'composed') {
    return buildComposedVariant;
  }
  pluginLog('[scaffold]', 'unknown archetype route, falling back to chip', route);
  return buildChipVariant;
}

export async function scaffold(
  spec: ComponentSpecV1,
  target: PageNode | ComponentScaffoldTarget,
  options?: ScaffoldOptions,
): Promise<ScaffoldResult> {
  validateSpec(spec);

  const displayTitle =
    options !== undefined && options.displayTitle !== undefined
      ? options.displayTitle
      : spec.name;
  const scaffoldId = buildScaffoldId(spec.name, spec.variantMatrix);
  const expectedCount = expectedVariantCount(spec.variantMatrix);
  const resolved = resolveScaffoldParent(target);
  const docKey = 'docKey' in target ? target.docKey : undefined;

  let replacedExisting = false;
  const existing = findExistingComponentSet(target, scaffoldId, displayTitle);
  if (existing !== null) {
    existing.remove();
    replacedExisting = true;
  }
  removeScaffoldArtifacts(target, spec.name, docKey);

  const route = resolveArchetypeRoute(spec);
  const builder = dispatchArchetypeBuilder(route);
  const expanded = expandVariantMatrix(spec.variantMatrix);
  const builtComponents: ComponentNode[] = [];

  for (let i = 0; i < expanded.length; i++) {
    const entry = expanded[i];
    const ctx = projectBuildContext(spec, entry.combo, entry.name, options);
    const result = await builder(ctx);
    result.component.name = entry.name;
    builtComponents.push(result.component);
  }

  applyPropertiesToVariants(builtComponents, spec);

  const staging = await stageVariants(resolved.parent, spec.name, builtComponents);
  const componentSet = figma.combineAsVariants(builtComponents, resolved.parent);
  staging.remove();
  finalizeComponentSet(componentSet, displayTitle, scaffoldId);
  normalizeVariantMastersInSet(componentSet);

  const variantByKey = buildVariantByKey(componentSet);
  const auditRows = buildScaffoldAuditRows(componentSet, expectedCount);

  pluginLog('[scaffold]', {
    name: spec.name,
    variantCount: builtComponents.length,
    replacedExisting,
  });

  return {
    componentSet,
    variantCount: builtComponents.length,
    variantByKey,
    replacedExisting,
    scaffoldId,
    auditRows,
    unresolvedTokens: [],
  };
}

/**
 * Locked forward scaffold sequence — WO-027 mirrors this in scaffold/run handler.
 * FR-SCAF-5: buildUsageFrame runs only after applyProperties completes.
 */
export async function forwardScaffold(
  spec: ComponentSpecV1,
  target: PageNode | ComponentScaffoldTarget,
  options?: ScaffoldOptions,
): Promise<{
  scaffoldResult: ScaffoldResult;
  bindingsResult: import('./types').ApplyBindingsResult;
  propsResult: import('./types').ApplyPropertiesResult;
  usageResult: UsageFrameResult;
}> {
  const scaffoldResult = await scaffold(spec, target, options);
  const bindingsResult = await applyBindings(spec, scaffoldResult.componentSet);
  const propsResult = applyProperties(spec, scaffoldResult.componentSet);
  const usageCtx: import('./types').UsageFrameContext = {
    variantByKey: scaffoldResult.variantByKey,
    applyPropertiesResult: propsResult,
    scaffoldId: scaffoldResult.scaffoldId,
  };
  if ('docRoot' in target) {
    usageCtx.scaffoldTarget = target;
    usageCtx.targetPage = target.page;
    usageCtx.docRoot = target.docRoot;
  } else {
    usageCtx.targetPage = target;
  }
  const pipelineResult = await buildDocPipeline(scaffoldResult.componentSet, spec, usageCtx);
  const usageResult = {
    ok: pipelineResult.ok,
    frame: pipelineResult.sections.usage,
    wrapper: pipelineResult.sections.setGroup,
    instances: [] as InstanceNode[],
    combos: [],
    instanceCount: 0,
    auditRows: pipelineResult.auditRows,
    setPropertiesErrors: [] as string[],
  };
  pluginLog('[scaffold] buildDocPipeline', {
    ok: usageResult.ok,
    sections: 5,
    auditPass: usageResult.auditRows.every(function auditPass(row) {
      return row.pass;
    }),
  });
  return {
    scaffoldResult: scaffoldResult,
    bindingsResult: bindingsResult,
    propsResult: propsResult,
    usageResult: usageResult,
  };
}

export { buildScaffoldAuditRows } from './auditRows';
export {
  applyBindings,
  normalizeVariablePath,
  parseBindingSelector,
} from './applyBindings';
export { applyProperties, applyPropertiesToVariants } from './applyProperties';
export { normalizeVariantMasterGeometry, normalizeVariantMastersInSet } from './variantGeometry';
export { resolveBindingTarget } from './resolveBindingTarget';
export {
  comboToSetProperties,
  curateVariantCombos,
  formatVariantTupleLabel,
  MAX_USAGE_INSTANCES,
} from './curateVariantCombos';
export { runBindingsThenProperties } from './pipeline';
export type {
  ApplyBindingsOptions,
  ApplyBindingsResult,
  ApplyPropertiesResult,
  BindingFailure,
  BindingFailureReason,
  BindingKind,
  ComponentAuditInput,
  PropApplyFailure,
  ScaffoldOptions,
  ScaffoldResult,
  UsageFrameContext,
  UsageFrameResult,
} from './types';
export {
  PLUGIN_DATA_SCAFFOLD_ID,
  PLUGIN_DATA_SPEC_VERSION,
  PLUGIN_DATA_USAGE_FRAME,
} from './types';
export {
  buildUsageFrame,
  resolveVariantComponent,
} from './usageFrame';
export {
  ensureComponentScaffoldTarget,
  ensureComponentsPage,
  type ComponentScaffoldTarget,
} from './ensureComponentScaffoldTarget';
export {
  COMPONENT_PAGE_BY_SPEC_NAME,
  docComponentRootName,
  docComponentSetGroupName,
  docUsageSectionName,
  resolveComponentPageName,
  specNameToDocKey,
} from './componentPageRouting';
export { buildUsageFrameAuditRows, USAGE_AUDIT_RULE_IDS } from './usageFrameAudit';
export {
  buildScaffoldId,
  expandVariantMatrix,
  expectedVariantCount,
  formatVariantName,
  hashVariantMatrix,
  parseVariantName,
} from './variantMatrix';

// Scaffold pipeline (WO-022 → WO-023 → WO-024 → WO-025):
// const { scaffoldResult, bindingsResult, propsResult, usageResult } =
//   await forwardScaffold(spec, targetPage);
