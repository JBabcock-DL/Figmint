import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';

import { buildDocPipeline } from '@/core/canvas/doc';
import { pluginLog } from '@/core/pluginLog';

import {
  docComponentRootName,
  docComponentSetGroupName,
  docUsageSectionName,
  specNameToDocKey,
} from './componentPageRouting';
import {
  ensureComponentScaffoldTarget,
  ensureDocOnPage,
} from './ensureComponentScaffoldTarget';
import type { ComponentScaffoldTarget } from './ensureComponentScaffoldTarget';
import type { UsageFrameContext, UsageFrameResult, VariantCombo } from './types';
import { buildUsageFrameAuditRows } from './usageFrameAudit';
import { formatVariantName } from './variantMatrix';

/** @deprecated DesignOps doc pipeline uses `doc/component/{key}/usage`. */
export function forwardScaffoldWrapperName(specName: string): string {
  return docComponentSetGroupName(specNameToDocKey(specName));
}

/** @deprecated DesignOps doc pipeline uses `doc/component/{key}/usage`. */
export function usageExamplesFrameName(specName: string): string {
  return docUsageSectionName(specNameToDocKey(specName));
}

function resolveScaffoldTarget(
  specName: string,
  ctx: UsageFrameContext,
): ComponentScaffoldTarget {
  if (ctx.scaffoldTarget !== undefined) {
    return ctx.scaffoldTarget;
  }
  if (ctx.docRoot !== undefined && ctx.targetPage !== undefined) {
    return {
      page: ctx.targetPage,
      pageName: ctx.targetPage.name,
      content: ctx.docRoot.parent as FrameNode,
      docRoot: ctx.docRoot,
      docKey: specNameToDocKey(specName),
    };
  }
  if (ctx.targetPage !== undefined) {
    return ensureDocOnPage(ctx.targetPage, specName);
  }
  return ensureComponentScaffoldTarget(specName);
}

function findChildFrame(parent: FrameNode, name: string): FrameNode | null {
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (child.type === 'FRAME' && child.name === name) {
      return child;
    }
  }
  return null;
}

export function findComponentSetGroup(docRoot: FrameNode, docKey: string): FrameNode | null {
  return findChildFrame(docRoot, docComponentSetGroupName(docKey));
}

/**
 * BUG-S5-001 / BUG-S5-003 — Doc-pipeline section frames stretch to the parent doc width (1640).
 */
export function createDocSectionFrame(name: string, layoutMode: 'HORIZONTAL' | 'VERTICAL'): FrameNode {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = layoutMode;
  if (layoutMode === 'VERTICAL') {
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'FIXED';
  } else {
    frame.primaryAxisSizingMode = 'FIXED';
    frame.counterAxisSizingMode = 'AUTO';
  }
  frame.layoutAlign = 'STRETCH';
  frame.fills = [];
  return frame;
}

export function reassertDocSectionStretch(section: FrameNode): void {
  if (section.layoutMode === 'VERTICAL') {
    section.primaryAxisSizingMode = 'AUTO';
    section.counterAxisSizingMode = 'FIXED';
  } else if (section.layoutMode === 'HORIZONTAL') {
    section.primaryAxisSizingMode = 'FIXED';
    section.counterAxisSizingMode = 'AUTO';
  }
  section.layoutAlign = 'STRETCH';
  section.layoutSizingVertical = 'HUG';
}

export function ensureComponentSetGroup(
  docRoot: FrameNode,
  componentSet: ComponentSetNode,
  docKey: string,
): FrameNode {
  const groupName = docComponentSetGroupName(docKey);
  let group = findComponentSetGroup(docRoot, docKey);
  if (group === null) {
    group = createDocSectionFrame(groupName, 'VERTICAL');
    docRoot.appendChild(group);
    reassertDocSectionStretch(group);
  }

  if (componentSet.parent !== group) {
    if (componentSet.parent !== null) {
      componentSet.remove();
    }
    group.insertChild(0, componentSet);
    reassertDocSectionStretch(group);
  }

  return group;
}

export function findUsageSection(docRoot: FrameNode, docKey: string): FrameNode | null {
  return findChildFrame(docRoot, docUsageSectionName(docKey));
}

export function ensureUsageSection(docRoot: FrameNode, docKey: string): FrameNode {
  const sectionName = docUsageSectionName(docKey);
  let section = findUsageSection(docRoot, docKey);
  if (section === null) {
    section = createDocSectionFrame(sectionName, 'VERTICAL');
    docRoot.appendChild(section);
    reassertDocSectionStretch(section);
  }
  return section;
}

export function removeUsageSectionContents(section: FrameNode): void {
  for (let i = section.children.length - 1; i >= 0; i--) {
    section.children[i].remove();
  }
}

/** @deprecated Use `findComponentSetGroup`. */
export function findForwardScaffoldWrapper(page: PageNode, specName: string): FrameNode | null {
  const docKey = specNameToDocKey(specName);
  for (let i = 0; i < page.children.length; i++) {
    const child = page.children[i];
    if (child.type !== 'FRAME') {
      continue;
    }
    const group = findComponentSetGroup(child, docKey);
    if (group !== null) {
      return group;
    }
    if (child.name === docComponentRootName(docKey)) {
      return findComponentSetGroup(child, docKey);
    }
  }
  return null;
}

/**
 * Legacy matrix pattern — instances come from the matching variant ComponentNode,
 * not ComponentSetNode.createInstance() (not available in all Figma runtimes).
 */
export function resolveVariantComponent(
  componentSet: ComponentSetNode,
  combo: VariantCombo,
  variantByKey?: Record<string, ComponentNode>,
): ComponentNode {
  const variantKey = formatVariantName(combo);

  if (variantByKey !== undefined && variantByKey[variantKey] !== undefined) {
    return variantByKey[variantKey];
  }

  for (let i = 0; i < componentSet.children.length; i++) {
    const child = componentSet.children[i];
    if (child.type === 'COMPONENT' && child.name === variantKey) {
      return child as ComponentNode;
    }
  }

  throw new Error('usageFrame: variant not found for combo: ' + variantKey);
}

function hasDoDontCards(usageSection: FrameNode): boolean {
  if (usageSection.layoutMode !== 'HORIZONTAL') {
    return false;
  }
  let doCard = false;
  let dontCard = false;
  for (let i = 0; i < usageSection.children.length; i++) {
    const child = usageSection.children[i];
    if (child.type !== 'FRAME') {
      continue;
    }
    if (child.name === 'usage/do') {
      doCard = true;
    }
    if (child.name === 'usage/dont') {
      dontCard = true;
    }
  }
  return doCard && dontCard;
}

/**
 * FR-SCAF-5 — delegates to full DesignOps doc pipeline (WO-057).
 * @deprecated Prefer `buildDocPipeline`; kept for WO-022..026 import stability.
 */
export async function buildUsageFrame(
  componentSet: ComponentSetNode,
  spec: ComponentSpecV1,
  ctx: UsageFrameContext,
): Promise<UsageFrameResult> {
  const pipelineResult = await buildDocPipeline(componentSet, spec, ctx);

  return {
    ok: pipelineResult.ok,
    frame: pipelineResult.sections.usage,
    wrapper: pipelineResult.sections.setGroup,
    instances: [],
    combos: [],
    instanceCount: 0,
    auditRows: pipelineResult.auditRows,
    setPropertiesErrors: [],
  };
}
